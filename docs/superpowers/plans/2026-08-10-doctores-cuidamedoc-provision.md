# Provisión automática de doctores en CuidameDoc + vínculo cabeza-trabajador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un admin crea un profesional (doctor) en Medis, se le aprovisiona automáticamente una cuenta activa en CuidameDoc con las mismas credenciales, enlazada como "trabajador" del profesional cabeza del sitio (hoy Diana en `cuidame_doc_backend`, `professional_id=12`).

**Architecture:** Dos repos, cambio aditivo en cada uno. CuidameDoc gana una columna `professionals.head_professional_id` y un endpoint nuevo `POST /professionals/team-members` (autenticado como la cabeza) que crea User+rol+Professional ya activos. Medis gana una columna `users.doc_professional_id` y un servicio best-effort (`docProfessionalProvision.service.ts`, mismo patrón que `docServiceSync.service.ts`) que llama a ese endpoint justo después de crear el profesional localmente, sin bloquear la creación si falla.

**Tech Stack:** CuidameDoc: Express + TypeORM + Postgres + Jest. Medis backend: Express + `pg` (SQL crudo) + Postgres + Node `node:test`. Medis frontend: React + Vite (`medisdiana-landing`).

## Global Constraints

- Falla de aprovisionamiento en CuidameDoc nunca bloquea ni revierte la creación local en Medis (spec: "Falla de aprovisionamiento en CuidameDoc").
- La cuenta creada en CuidameDoc nace `status: active`, `verified: true`, `Professional.status: ACTIVE` — sin correo de verificación (spec: "Activación inmediata").
- Solo `role === 'PROFESSIONAL'` dispara el flujo; `ADMIN` no provisiona nada en CuidameDoc (spec: "Alcance de roles").
- `gender` no recogido por el formulario de Medis → se manda `'No especifica'` por defecto (spec: "Campo género").
- `head_professional_id` es nullable; ningún código existente debe leerlo — profesionales fuera de este flujo siguen funcionando exactamente igual (spec: "Contexto y causa raíz" + confirmación explícita al usuario).
- No hay reintento automático, ni edición del vínculo después de creado, ni sincronización de ediciones posteriores (spec: "Fuera de alcance").

---

## Task 1: CuidameDoc — columna `head_professional_id`

**Files:**
- Create: `cuidame_doc_backend/src/scripts/051-professional-head-link.sql`
- Modify: `cuidame_doc_backend/src/models/professional.model.ts`

**Interfaces:**
- Produces: `Professional.head_professional_id?: number` — usado por Task 2.

- [x] **Step 1: Escribir la migración**

```sql
-- cuidame_doc_backend/src/scripts/051-professional-head-link.sql
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS head_professional_id INTEGER
    REFERENCES professionals(professional_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professionals_head
  ON professionals (head_professional_id)
  WHERE head_professional_id IS NOT NULL;
```

- [x] **Step 2: Agregar el campo a la entidad TypeORM**

En `cuidame_doc_backend/src/models/professional.model.ts`, agregar dentro de
`class Professional`, junto a los demás `@Column` (después de
`reviews_survey_enabled`, antes de `created_at`):

```ts
  @Column({ type: 'int', nullable: true })
  head_professional_id?: number;
```

No agregar relación `@ManyToOne` — evita eager-loading accidental en queries
existentes que ya seleccionan campos explícitos (`getAllProfessionals`).

- [x] **Step 3: Correr la migración localmente y verificar la columna**

```bash
cd cuidame_doc_backend
npm run build
npm run migrate
```

Verificar en la base de datos de desarrollo:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'professionals' AND column_name = 'head_professional_id';
```

Expected: una fila.

- [x] **Step 4: Commit**

```bash
git add src/scripts/051-professional-head-link.sql src/models/professional.model.ts
git commit -m "feat(professionals): add head_professional_id column for team-member linking

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: CuidameDoc — `ProfessionalService.createTeamMember`

**Files:**
- Modify: `cuidame_doc_backend/src/modules/professional/professional.service.ts`
- Modify: `cuidame_doc_backend/src/modules/professional/professional.dto.ts`
- Test: `cuidame_doc_backend/src/tests/professional-create-team-member.test.ts`

**Interfaces:**
- Consumes: `Professional.head_professional_id` (Task 1); `UserRepository` (`findByEmail(email)`, `create(data)`, `assignRole(userId, roleId)`) de `../user/user.repository`; `RoleRepository.findByName(name)` de `../role/role.repository`; `PasswordService.hashPassword(password)` de `../../utils/password.util`; `ForbiddenError`, `ConflictError`, `BadRequestError` de `../../utils/error-handler`; `User`, `UserStatus` de `../../models/user.model`.
- Produces: `ProfessionalService.createTeamMember(headUser: User, dto: CreateTeamMemberDto): Promise<{ professional_id: number; user_id: number }>` — usado por Task 3. Lanza `ForbiddenError` (403) si `headUser` no tiene fila en `professionals`; `BadRequestError` (400) si falta `medical_license_number`; `ConflictError` (409) si el email ya existe.

- [x] **Step 1: Agregar el DTO**

En `cuidame_doc_backend/src/modules/professional/professional.dto.ts`, agregar al final:

```ts
export interface CreateTeamMemberDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  identification_type: string;
  identification_number?: string;
  phone: string;
  address?: string;
  medical_license_number: string;
  specialization?: string;
}

export interface TeamMemberResponseDto {
  professional_id: number;
  user_id: number;
}
```

- [x] **Step 2: Escribir el test que falla primero**

```ts
// cuidame_doc_backend/src/tests/professional-create-team-member.test.ts
import { ProfessionalService } from '../modules/professional/professional.service';
import { AppDataSource } from '../core/config/database';
import { UserStatus } from '../models/user.model';
import { ProfessionalStatus } from '../models/professional.model';

jest.mock('../core/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('ProfessionalService.createTeamMember', () => {
  let service: ProfessionalService;
  let proRepo: any;
  let userRepo: any;
  let roleRepo: any;
  let userRoleRepo: any;

  beforeEach(() => {
    proRepo = {
      findOne: jest.fn(),
      create: jest.fn((d: any) => d),
      save: jest.fn(async (d: any) => ({ ...d, professional_id: 99 })),
    };
    userRoleRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d: any) => d),
      save: jest.fn(async (d: any) => d),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d: any) => d),
      save: jest.fn(async (d: any) => ({ ...d, id: 501 })),
      manager: { getRepository: jest.fn(() => userRoleRepo) },
    };
    roleRepo = { findOne: jest.fn() };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity?.name === 'Professional') return proRepo;
      if (entity?.name === 'User') return userRepo;
      if (entity?.name === 'Role') return roleRepo;
      return userRoleRepo;
    });

    service = new ProfessionalService();
  });

  const headUser = { id: 12, city_id: 5 } as any;
  const validDto = {
    email: 'ximena@example.com', password: 'Segura123',
    first_name: 'Ximena', last_name: 'Pérez',
    identification_type: 'CC', identification_number: '123456',
    phone: '3000000000', address: 'Calle 1',
    medical_license_number: 'RM-999',
  };

  it('rechaza si quien llama no tiene fila en professionals', async () => {
    proRepo.findOne.mockResolvedValue(null);
    await expect(service.createTeamMember(headUser, validDto as any))
      .rejects.toThrow('Solo un profesional puede dar de alta trabajadores.');
  });

  it('rechaza si medical_license_number viene vacío', async () => {
    proRepo.findOne.mockResolvedValue({ professional_id: 12, user_id: 12 });
    await expect(service.createTeamMember(headUser, { ...validDto, medical_license_number: '' } as any))
      .rejects.toThrow('medical_license_number es requerido.');
  });

  it('rechaza si el email ya existe', async () => {
    proRepo.findOne.mockResolvedValue({ professional_id: 12, user_id: 12 });
    userRepo.findOne.mockResolvedValue({ id: 777, email: validDto.email });
    await expect(service.createTeamMember(headUser, validDto as any))
      .rejects.toThrow('Este correo ya está registrado.');
  });

  it('crea el usuario activo con la ciudad de la cabeza, asigna el rol y enlaza head_professional_id', async () => {
    proRepo.findOne.mockResolvedValue({ professional_id: 12, user_id: 12 });
    roleRepo.findOne.mockResolvedValue({ role_id: 3, role_name: 'professional' });

    const result = await service.createTeamMember(headUser, validDto as any);

    expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ximena@example.com',
      status: UserStatus.ACTIVE,
      verified: true,
      city_id: 5,
      gender: 'No especifica',
    }));
    expect(proRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 501,
      head_professional_id: 12,
      status: ProfessionalStatus.ACTIVE,
      license_number: 'RM-999',
    }));
    expect(result).toEqual({ professional_id: 99, user_id: 501 });
  });
});
```

- [x] **Step 3: Correr el test para verificar que falla**

Run: `cd cuidame_doc_backend && npx jest professional-create-team-member -v`
Expected: FAIL — `service.createTeamMember is not a function`.

- [x] **Step 4: Implementar `createTeamMember`**

En `cuidame_doc_backend/src/modules/professional/professional.service.ts`:

Agregar imports al inicio del archivo:

```ts
import { UserRepository } from '../user/user.repository';
import { RoleRepository } from '../role/role.repository';
import { PasswordService } from '../../utils/password.util';
import { User, UserStatus } from '../../models/user.model';
import { ForbiddenError, ConflictError, BadRequestError } from '../../utils/error-handler';
import { CreateProfessionalDto, UpdateProfessionalDto, CreateTeamMemberDto, TeamMemberResponseDto } from './professional.dto';
```

(La línea `import { CreateProfessionalDto, UpdateProfessionalDto } from './professional.dto';` ya existe — reemplazarla por la de arriba en vez de duplicarla.)

En el constructor de `ProfessionalService`, agregar dos propiedades nuevas:

```ts
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;
```

y en el cuerpo del constructor:

```ts
    this.userRepository = new UserRepository();
    this.roleRepository = new RoleRepository();
```

Agregar el método nuevo (al final de la clase, antes del `}` de cierre):

```ts
  /**
   * Da de alta un profesional "trabajador" enlazado a `headUser` como cabeza.
   * Ver docs/superpowers/specs/2026-08-10-doctores-cuidamedoc-provision-design.md.
   * Cuenta activa de inmediato (sin correo de verificación) — quien la crea
   * ya es un profesional de confianza en el sistema.
   */
  async createTeamMember(headUser: User, dto: CreateTeamMemberDto): Promise<TeamMemberResponseDto> {
    const headProfessional = await this.professionalRepository.findOne({
      where: { user_id: headUser.id },
    });
    if (!headProfessional) {
      throw new ForbiddenError('Solo un profesional puede dar de alta trabajadores.');
    }

    if (!dto.medical_license_number || !dto.medical_license_number.trim()) {
      throw new BadRequestError('medical_license_number es requerido.');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('Este correo ya está registrado.');
    }

    // city_id hereda el de la cabeza: auth.service.ts::login asume que todo
    // usuario activo tiene una ciudad resoluble (Township) y este endpoint
    // no la recoge en el formulario de Medis.
    const newUser = await this.userRepository.create({
      email: normalizedEmail,
      password_hash: PasswordService.hashPassword(dto.password),
      first_name: dto.first_name,
      last_name: dto.last_name,
      identification_type: dto.identification_type,
      identification_number: dto.identification_number,
      phone: dto.phone,
      address: dto.address,
      gender: 'No especifica',
      city_id: headUser.city_id,
      status: UserStatus.ACTIVE,
      verified: true,
    });

    const professionalRole = await this.roleRepository.findByName('professional');
    if (!professionalRole) {
      throw new ForbiddenError('No existe el rol "professional" configurado en el sistema.');
    }
    await this.userRepository.assignRole(newUser.id, professionalRole.role_id);

    const professional = this.professionalRepository.create({
      user_id: newUser.id,
      license_number: dto.medical_license_number.trim(),
      specialization: dto.specialization,
      status: ProfessionalStatus.ACTIVE,
      head_professional_id: headProfessional.professional_id,
    });
    const saved = await this.professionalRepository.save(professional);

    return { professional_id: saved.professional_id, user_id: newUser.id };
  }
```

- [x] **Step 5: Correr el test para verificar que pasa**

Run: `cd cuidame_doc_backend && npx jest professional-create-team-member -v`
Expected: PASS (4 tests).

- [x] **Step 6: Commit**

```bash
git add src/modules/professional/professional.service.ts src/modules/professional/professional.dto.ts src/tests/professional-create-team-member.test.ts
git commit -m "feat(professionals): add ProfessionalService.createTeamMember

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: CuidameDoc — endpoint `POST /professionals/team-members`

**Files:**
- Modify: `cuidame_doc_backend/src/modules/professional/professional.controller.ts`
- Modify: `cuidame_doc_backend/src/modules/professional/professional.routes.ts`
- Test: `cuidame_doc_backend/src/tests/professional-create-team-member.controller.test.ts`

**Interfaces:**
- Consumes: `ProfessionalService.createTeamMember` (Task 2); `authMiddleware` de `../../middlewares/auth.middleware` (ya importado en `professional.routes.ts`).
- Produces: ruta `POST /professionals/team-members` (montada como `/api/professionals/team-members` vía `routes/index.ts`, ya existente) — consumida por Medis en Task 5.

- [x] **Step 1: Escribir el test que falla primero**

```ts
// cuidame_doc_backend/src/tests/professional-create-team-member.controller.test.ts
import { ProfessionalController } from '../modules/professional/professional.controller';
import { ProfessionalService } from '../modules/professional/professional.service';

describe('ProfessionalController.createTeamMember', () => {
  function makeRes() {
    const res: any = { statusCode: 200, body: undefined };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (payload: unknown) => { res.body = payload; return res; };
    return res;
  }

  it('delega en el service con req.user y responde 201 con { professional_id, user_id }', async () => {
    const controller = new ProfessionalController();
    const spy = jest
      .spyOn(ProfessionalService.prototype, 'createTeamMember')
      .mockResolvedValue({ professional_id: 99, user_id: 501 });

    const req: any = { user: { id: 12 }, body: { email: 'ximena@example.com' } };
    const res = makeRes();
    const next = jest.fn();

    await controller.createTeamMember(req, res, next);

    expect(spy).toHaveBeenCalledWith(req.user, req.body);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      success: true,
      data: { professional_id: 99, user_id: 501 },
    }));
    expect(next).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('si el service lanza, llama next(error) en vez de responder', async () => {
    const controller = new ProfessionalController();
    const err = new Error('boom');
    const spy = jest
      .spyOn(ProfessionalService.prototype, 'createTeamMember')
      .mockRejectedValue(err);

    const req: any = { user: { id: 12 }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    await controller.createTeamMember(req, res, next);

    expect(next).toHaveBeenCalledWith(err);

    spy.mockRestore();
  });
});
```

- [x] **Step 2: Correr el test para verificar que falla**

Run: `cd cuidame_doc_backend && npx jest professional-create-team-member.controller -v`
Expected: FAIL — `controller.createTeamMember is not a function`.

- [x] **Step 3: Implementar el método del controller**

En `cuidame_doc_backend/src/modules/professional/professional.controller.ts`, cambiar el import del tope:

```ts
import { Request, Response, NextFunction } from 'express';
```

y agregar el método (al final de la clase, antes del `}` de cierre):

```ts
  async createTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const headUser = (req as any).user;
      const result = await this.professionalService.createTeamMember(headUser, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Profesional trabajador creado y enlazado correctamente.',
      });
    } catch (error) {
      next(error);
    }
  }
```

- [x] **Step 4: Montar la ruta**

En `cuidame_doc_backend/src/modules/professional/professional.routes.ts`, agregar
justo después de la línea `router.post('/', authMiddleware, professionalController.createProfessional.bind(professionalController));`:

```ts
router.post('/team-members', authMiddleware, professionalController.createTeamMember.bind(professionalController));
```

- [x] **Step 5: Correr el test para verificar que pasa**

Run: `cd cuidame_doc_backend && npx jest professional-create-team-member.controller -v`
Expected: PASS (2 tests).

- [x] **Step 6: Commit**

```bash
git add src/modules/professional/professional.controller.ts src/modules/professional/professional.routes.ts src/tests/professional-create-team-member.controller.test.ts
git commit -m "feat(professionals): mount POST /professionals/team-members

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Medis — columna `doc_professional_id`

**Files:**
- Create: `apps/backend/migrations/024_professional_doc_link.sql`
- Modify: `apps/backend/src/repositories/professional.repository.ts`

**Interfaces:**
- Produces: `ProfessionalRepository.setDocProfessionalId(id: string, docProfessionalId: number): Promise<void>` — usado por Task 6.

- [x] **Step 1: Escribir la migración**

```sql
-- apps/backend/migrations/024_professional_doc_link.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS doc_professional_id INTEGER;
```

- [x] **Step 2: Correrla localmente**

```bash
cd apps/backend
npm run migrate
```

Verificar:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'doc_professional_id';
```

Expected: una fila.

- [x] **Step 3: Agregar el método al repositorio**

En `apps/backend/src/repositories/professional.repository.ts`, agregar dentro
del objeto `ProfessionalRepository`, después de `updateStatus`:

```ts
  /** Store the CuidameDoc professional_id this user was provisioned as (best-effort link) */
  async setDocProfessionalId(id: string, docProfessionalId: number): Promise<void> {
    await pool.query(`UPDATE users SET doc_professional_id = $1 WHERE id = $2`, [docProfessionalId, id])
  },
```

- [x] **Step 4: Commit**

```bash
git add apps/backend/migrations/024_professional_doc_link.sql apps/backend/src/repositories/professional.repository.ts
git commit -m "feat(professionals): add doc_professional_id column + repository setter

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Medis — `docProfessionalProvision.service.ts`

**Files:**
- Modify: `apps/backend/src/utils/docAuth.ts`
- Modify: `apps/backend/src/services/docServiceSync.service.ts`
- Create: `apps/backend/src/services/docProfessionalProvision.service.ts`
- Test: `apps/backend/src/services/docProfessionalProvision.service.test.ts`

**Interfaces:**
- Consumes: `getDocToken`, `refreshDocToken` de `docAuth.ts` (ya existen); `env.DOC_API_URL` de `@config/env.js`.
- Produces: `withDocAuth(fetchFn)` ahora exportado desde `docAuth.ts` (movido desde `docServiceSync.service.ts`, mismo comportamiento). `provisionDocProfessional(params: ProvisionDocProfessionalParams): Promise<ProvisionDocProfessionalResult>` — usado por Task 6.

- [x] **Step 1: Mover `withDocAuth` a `docAuth.ts` (elimina duplicación entre los dos servicios de sync)**

En `apps/backend/src/utils/docAuth.ts`, agregar al final del archivo:

```ts
/** Llama `fetchFn` con el token actual; si CuidameDoc responde 401, refresca una vez y reintenta. */
export async function withDocAuth(fetchFn: (token: string) => Promise<Response>): Promise<Response> {
  let token = await getDocToken();
  let res = await fetchFn(token);
  if (res.status === 401) {
    token = await refreshDocToken();
    res = await fetchFn(token);
  }
  return res;
}
```

En `apps/backend/src/services/docServiceSync.service.ts`:
- Cambiar el import de `import { getDocToken, refreshDocToken } from '@utils/docAuth.js';` a
  `import { withDocAuth } from '@utils/docAuth.js';`.
- Borrar la función local `withDocAuth` (líneas 55-64, la que dice
  `async function withDocAuth(fetchFn...`) — ya no se define aquí, se importa.

- [x] **Step 2: Correr los tests existentes para verificar que el refactor no rompió nada**

Run: `cd apps/backend && npx tsx --test src/services/docServiceSync.service.test.ts`
Expected: PASS (todos los tests existentes, sin cambios de comportamiento).

- [x] **Step 3: Escribir el test que falla primero para el servicio nuevo**

```ts
// apps/backend/src/services/docProfessionalProvision.service.test.ts
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { provisionDocProfessional } from './docProfessionalProvision.service.js';

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

const baseParams = {
  email: 'ximena@example.com', password: 'Segura123',
  firstName: 'Ximena', lastName: 'Pérez',
  idType: 'CC', idNumber: '123456', phone: '3000000000',
  address: 'Calle 1', medicalRegistrationNumber: 'RM-999',
};

test('provisionDocProfessional: éxito → devuelve ok y el professional_id de CuidameDoc', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { professional_id: 99, user_id: 501 } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, true);
  assert.equal(result.docProfessionalId, 99);
});

test('provisionDocProfessional: CuidameDoc responde error (ej. email duplicado) → ok:false con el mensaje', async (t) => {
  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Este correo ya está registrado.' }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await provisionDocProfessional(baseParams);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Este correo ya está registrado.');
});

test('provisionDocProfessional: fallo de red → ok:false, nunca lanza', async (t) => {
  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    throw new TypeError('fetch failed: network error');
  });

  await assert.doesNotReject(async () => {
    const result = await provisionDocProfessional(baseParams);
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });
});
```

- [x] **Step 4: Correr el test para verificar que falla**

Run: `cd apps/backend && npx tsx --test src/services/docProfessionalProvision.service.test.ts`
Expected: FAIL — no se encuentra el módulo `./docProfessionalProvision.service.js`.

- [x] **Step 5: Implementar el servicio**

```ts
// apps/backend/src/services/docProfessionalProvision.service.ts
// ============================================================
// Aprovisiona automáticamente, en CuidameDoc, la cuenta correspondiente a un
// profesional recién creado en Medis, enlazada como "trabajador" de la
// cabeza del sitio (docs/superpowers/specs/2026-08-10-doctores-cuidamedoc-provision-design.md).
// Nunca lanza — toda llamada de red vuelve como { ok, error? } para que el
// llamador decida qué hacer sin tumbar la creación local ya exitosa.
// ============================================================

import { env } from '@config/env.js';
import { withDocAuth } from '@utils/docAuth.js';

export interface ProvisionDocProfessionalParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idType: string;
  idNumber: string;
  phone: string;
  address: string;
  medicalRegistrationNumber: string;
  specialties?: string[];
}

export interface ProvisionDocProfessionalResult {
  ok: boolean;
  docProfessionalId?: number;
  error?: string;
}

export async function provisionDocProfessional(
  params: ProvisionDocProfessionalParams
): Promise<ProvisionDocProfessionalResult> {
  try {
    const body = JSON.stringify({
      email: params.email,
      password: params.password,
      first_name: params.firstName,
      last_name: params.lastName,
      identification_type: params.idType,
      identification_number: params.idNumber,
      phone: params.phone,
      address: params.address,
      medical_license_number: params.medicalRegistrationNumber,
      specialization: params.specialties?.[0],
    });

    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/professionals/team-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(8000),
      })
    );

    const json = await res.json() as { success: boolean; data?: { professional_id: number }; message?: string };
    if (!res.ok || !json.success || !json.data) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true, docProfessionalId: json.data.professional_id };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}
```

- [x] **Step 6: Correr el test para verificar que pasa**

Run: `cd apps/backend && npx tsx --test src/services/docProfessionalProvision.service.test.ts`
Expected: PASS (3 tests).

- [x] **Step 7: Commit**

```bash
git add apps/backend/src/utils/docAuth.ts apps/backend/src/services/docServiceSync.service.ts apps/backend/src/services/docProfessionalProvision.service.ts apps/backend/src/services/docProfessionalProvision.service.test.ts
git commit -m "feat(professionals): add docProfessionalProvision.service, extract withDocAuth

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Medis — wire provisioning into `ProfessionalService.create`

**Files:**
- Modify: `apps/backend/src/services/professional.service.ts`
- Modify: `apps/backend/src/controllers/professional.controller.ts`
- Test: `apps/backend/src/services/professional.service.docsync.test.ts`

**Interfaces:**
- Consumes: `provisionDocProfessional` (Task 5); `ProfessionalRepository.setDocProfessionalId` (Task 4).
- Produces: `ProfessionalService.create(...)` ahora devuelve `Promise<{ professional: ProfessionalPublic | UserPublic; docSync?: { ok: boolean; error?: string } }>` (cambio de forma — antes devolvía `ProfessionalPublic | UserPublic` directo). El controller responde `{ success: true, data: { professional }, docSync }`, consumido por el frontend en Task 7.

- [x] **Step 1: Escribir el test que falla primero**

```ts
// apps/backend/src/services/professional.service.docsync.test.ts
import { test, after, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ProfessionalService } from './professional.service.js';

after(async () => {
  await pool.end();
});

function fetchMock(t: TestContext, handler: (url: string, init: any) => Response) {
  return t.mock.method(globalThis, 'fetch', async (url: any, init: any) => handler(String(url), init));
}

function baseDto(overrides: Record<string, unknown> = {}) {
  return {
    email: `doc-sync-${Date.now()}@example.com`,
    password: 'Segura123',
    firstName: 'Ximena', lastName: 'Pérez',
    idType: 'CC', idNumber: String(Date.now()).slice(-9),
    phone: '3000000000', personalAddress: 'Calle 1',
    medicalRegistrationNumber: 'RM-999',
    sisproUsername: 'ximena.sispro', sisproPassword: 'sispro123',
    ...overrides,
  };
}

async function deleteTestUser(email: string) {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}

test('create: profesional creado + CuidameDoc responde bien → guarda doc_professional_id y docSync.ok=true', async (t) => {
  const dto = baseDto();
  t.after(() => deleteTestUser(dto.email));

  fetchMock(t, (url, init) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    if (url.endsWith('/professionals/team-members') && init?.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { professional_id: 99, user_id: 501 } }), { status: 201 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  const result = await ProfessionalService.create(dto as any);

  assert.equal(result.docSync?.ok, true);
  const { rows } = await pool.query('SELECT doc_professional_id FROM users WHERE email = $1', [dto.email]);
  assert.equal(rows[0].doc_professional_id, 99);
});

test('create: profesional creado + CuidameDoc falla → sigue creado localmente, docSync.ok=false, doc_professional_id queda NULL', async (t) => {
  const dto = baseDto();
  t.after(() => deleteTestUser(dto.email));

  fetchMock(t, (url) => {
    if (url.endsWith('/auth/login')) {
      return new Response(JSON.stringify({ success: true, data: { access_token: 'tok1', refresh_token: 'ref1' } }), { status: 200 });
    }
    throw new TypeError('fetch failed: network error');
  });

  const result = await ProfessionalService.create(dto as any);

  assert.ok(result.professional);
  assert.equal(result.docSync?.ok, false);
  assert.ok(result.docSync?.error);
  const { rows } = await pool.query('SELECT doc_professional_id FROM users WHERE email = $1', [dto.email]);
  assert.equal(rows[0].doc_professional_id, null);
});

test('create: role ADMIN → no llama a CuidameDoc, docSync es undefined', async (t) => {
  const dto = baseDto({
    role: 'ADMIN',
    medicalRegistrationNumber: undefined, sisproUsername: undefined, sisproPassword: undefined,
  });
  t.after(() => deleteTestUser(dto.email));

  fetchMock(t, (url) => { throw new Error(`fetch inesperado: ${url}`); });

  const result = await ProfessionalService.create(dto as any);

  assert.equal(result.docSync, undefined);
});
```

- [x] **Step 2: Correr el test para verificar que falla**

Run: `cd apps/backend && npx tsx --test src/services/professional.service.docsync.test.ts`
Expected: FAIL — `result.docSync` es `undefined` en los dos primeros tests (el service todavía no llama a `provisionDocProfessional`).

- [x] **Step 3: Implementar el cambio en `professional.service.ts`**

Agregar el import al inicio de `apps/backend/src/services/professional.service.ts`:

```ts
import { provisionDocProfessional } from './docProfessionalProvision.service.js'
```

Reemplazar el método `create` completo por:

```ts
  async create(dto: CreateProfessionalDTO & { role?: UserRole }): Promise<{
    professional: ProfessionalPublic | UserPublic
    docSync?: { ok: boolean; error?: string }
  }> {
    const exists = await UserRepository.emailExists(dto.email)
    if (exists) throw Object.assign(new Error('El email ya está registrado.'), { statusCode: 409 })

    const idNumberTaken = await UserRepository.idNumberExists(dto.idNumber)
    if (idNumberTaken) throw Object.assign(new Error('El número de documento ya está registrado.'), { statusCode: 409 })

    if (!/^\d+$/.test(dto.idNumber)) {
      throw Object.assign(new Error('El número de documento debe contener solo dígitos.'), { statusCode: 400 })
    }

    if (!dto.role || dto.role === 'PROFESSIONAL') {
      if (!dto.medicalRegistrationNumber || !dto.sisproUsername || !dto.sisproPassword) {
        throw Object.assign(new Error('Registro Médico, Usuario SISPRO y Contraseña SISPRO son obligatorios para profesionales.'), { statusCode: 400 })
      }
    }

    const passwordHash = hashPassword(dto.password)
    if (dto.role && dto.role !== 'PROFESSIONAL') {
      const user = await UserRepository.create({ ...dto, role: dto.role, passwordHash })
      return { professional: user }
    }

    const professional = await ProfessionalRepository.create({ ...dto, passwordHash })

    // Aprovisiona la cuenta correspondiente en CuidameDoc — best-effort, nunca
    // bloquea la creación local ya exitosa. Ver
    // docs/superpowers/specs/2026-08-10-doctores-cuidamedoc-provision-design.md.
    const docSync = await provisionDocProfessional({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      idType: dto.idType,
      idNumber: dto.idNumber,
      phone: dto.phone ?? '',
      address: dto.personalAddress,
      medicalRegistrationNumber: dto.medicalRegistrationNumber!,
      specialties: dto.specialties,
    })
    if (docSync.ok && docSync.docProfessionalId) {
      await ProfessionalRepository.setDocProfessionalId(professional.id, docSync.docProfessionalId)
    }

    return { professional, docSync: { ok: docSync.ok, error: docSync.error } }
  },
```

- [x] **Step 4: Actualizar el controller para el nuevo shape de retorno**

En `apps/backend/src/controllers/professional.controller.ts`, reemplazar:

```ts
export async function createProfessional(req: Request, res: Response): Promise<void> {
  try {
    const professional = await ProfessionalService.create(req.body)
    res.status(201).json({ success: true, data: { professional } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}
```

por:

```ts
export async function createProfessional(req: Request, res: Response): Promise<void> {
  try {
    const { professional, docSync } = await ProfessionalService.create(req.body)
    res.status(201).json({ success: true, data: { professional }, ...(docSync ? { docSync } : {}) })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}
```

- [x] **Step 5: Correr el test para verificar que pasa**

Run: `cd apps/backend && npx tsx --test src/services/professional.service.docsync.test.ts`
Expected: PASS (3 tests).

- [x] **Step 6: Correr la suite completa de `apps/backend` para verificar que nada más se rompió**

Run: `cd apps/backend && npm test`
Expected: PASS (todos los tests, incluidos los de `services.controller.docsync.test.ts` y `docServiceSync.service.test.ts` del Task 5).

- [x] **Step 7: Commit**

```bash
git add apps/backend/src/services/professional.service.ts apps/backend/src/controllers/professional.controller.ts apps/backend/src/services/professional.service.docsync.test.ts
git commit -m "feat(professionals): provision CuidameDoc account on create, return docSync

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Medis frontend — pasar `docSync` desde `CreateProfessionalModal`

**Files:**
- Modify: `medisdiana-landing/src/components/admin/CreateProfessionalModal.tsx`

**Interfaces:**
- Consumes: respuesta de `POST /api/professionals` ahora incluye `docSync?: { ok: boolean; error?: string }` (Task 6).
- Produces: `Props.onSuccess` cambia de `(pro: any) => void` a `(pro: any, docSync?: { ok: boolean; error?: string }) => void` — usado por Task 8.

- [x] **Step 1: Cambiar la firma de `onSuccess` en `Props`**

```ts
interface Props {
  onClose: () => void
  onSuccess: (pro: any, docSync?: { ok: boolean; error?: string }) => void
}
```

- [x] **Step 2: Pasar `data.docSync` al llamar `onSuccess`**

En el método `submit`, cambiar:

```ts
      onSuccess(data.data.professional)
```

por:

```ts
      onSuccess(data.data.professional, data.docSync)
```

- [x] **Step 3: Verificar que compila**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: sin errores (los dos consumidores se actualizan en el Task 8, antes de este paso ya deberían tipar bien porque `docSync` es opcional).

- [x] **Step 4: Commit**

```bash
git add medisdiana-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(professionals): pass docSync through onSuccess callback

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Medis frontend — toast de advertencia en los dos paneles admin

**Files:**
- Modify: `medisdiana-landing/src/components/admin/UsuariosDashboard.tsx`
- Modify: `medisdiana-landing/src/components/admin/AdminProfessionals.tsx`

**Interfaces:**
- Consumes: `onSuccess(pro, docSync)` (Task 7).

- [x] **Step 1: `UsuariosDashboard.tsx` — actualizar `handleCreated`**

Reemplazar:

```ts
  const handleCreated = (created: any) => {
    setUsers(prev => [created, ...prev])
    setShowModal(false)
    showToast(`${created.firstName} ${created.lastName} fue incorporado/a al equipo.`)
  }
```

por:

```ts
  const handleCreated = (created: any, docSync?: { ok: boolean; error?: string }) => {
    setUsers(prev => [created, ...prev])
    setShowModal(false)
    if (docSync && !docSync.ok) {
      showToast(`${created.firstName} ${created.lastName} fue incorporado/a al equipo, pero no se pudo habilitar su acceso a CuidameDoc: ${docSync.error ?? 'motivo desconocido'}`, 'error')
    } else {
      showToast(`${created.firstName} ${created.lastName} fue incorporado/a al equipo.`)
    }
  }
```

- [x] **Step 2: `AdminProfessionals.tsx` — actualizar `handleCreated`**

Reemplazar:

```ts
  const handleCreated = (created: UserCard) => {
    setProfessionals(prev => [created, ...prev])
    if (created.role === 'PROFESSIONAL') {
      setStats(s => s ? { ...s, totalProfessionals: s.totalProfessionals + 1, activeProfessionals: s.activeProfessionals + 1 } : s)
    }
    setShowModal(false)
    setToast(`${created.firstName} ${created.lastName} fue incorporada al equipo.`)
    setTimeout(() => setToast(null), 4000)
  }
```

por:

```ts
  const handleCreated = (created: UserCard, docSync?: { ok: boolean; error?: string }) => {
    setProfessionals(prev => [created, ...prev])
    if (created.role === 'PROFESSIONAL') {
      setStats(s => s ? { ...s, totalProfessionals: s.totalProfessionals + 1, activeProfessionals: s.activeProfessionals + 1 } : s)
    }
    setShowModal(false)
    if (docSync && !docSync.ok) {
      setToast(`${created.firstName} ${created.lastName} fue incorporada al equipo, pero no se pudo habilitar su acceso a CuidameDoc: ${docSync.error ?? 'motivo desconocido'}`)
    } else {
      setToast(`${created.firstName} ${created.lastName} fue incorporada al equipo.`)
    }
    setTimeout(() => setToast(null), 4000)
  }
```

- [x] **Step 3: Verificar que compila**

Run: `cd medisdiana-landing && npx tsc --noEmit`
Expected: sin errores.

- [x] **Step 4: Verificación manual**

Levantar `apps/backend` y `medisdiana-landing` en dev, crear un profesional
nuevo desde el panel de Usuarios con datos de prueba, y confirmar:
1. Se crea localmente en Medis (aparece en la lista) sin importar si
   CuidameDoc responde o no.
2. Si `DOC_API_URL`/`DOC_DIANA_EMAIL`/`DOC_DIANA_PASSWORD` apuntan a un
   CuidameDoc real y accesible, el toast de éxito no menciona ningún error, y
   el nuevo profesional puede iniciar sesión en `doc.cuidame.tech` con el
   mismo email/password.
3. Si se apaga el acceso a CuidameDoc (o se usa una URL inválida
   temporalmente en `.env`), el profesional igual queda creado en Medis y el
   toast muestra la advertencia con el motivo.

- [x] **Step 5: Commit**

```bash
git add medisdiana-landing/src/components/admin/UsuariosDashboard.tsx medisdiana-landing/src/components/admin/AdminProfessionals.tsx
git commit -m "feat(professionals): show CuidameDoc provisioning warning toast

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
