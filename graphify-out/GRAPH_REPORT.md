# Graph Report - .  (2026-07-17)

## Corpus Check
- 216 files · ~171,137 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1312 nodes · 1852 edges · 101 communities (81 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 366,558 input · 0 output

## Community Hubs (Navigation)
- Backend: Config y Autenticación
- Documentación del Proyecto
- Backend: Base de Datos y Seeds
- Backend: Dependencias
- Backend: TSConfig
- Admin: Formularios de Servicio
- Backend: Servidor y Arranque
- Portal Profesional: Agenda
- Backend: Controlador de Servicios
- Admin: Formulario de Sedes
- Backend: Membresías
- Docs Backend y SEO Landing
- Backend: Membresías de Usuario
- App React: Rutas Principales
- UI Components: Dependencias
- Tipos Compartidos de Servicios
- Landing: TSConfig App
- Monorepo: package.json Raíz
- Turbo: Pipeline de Build
- UI Components: TSConfig
- Admin: Calendario de Citas
- Landing: TSConfig Node
- Backend: Sedes y Horarios
- Landing: Dependencias UI
- Usuario: Servicios
- Backend: Descuentos
- Admin: Sidebar e Inventario
- Shared Types: TSConfig
- Landing: ESLint DevDeps
- Admin: Espacios
- Admin: Membresías
- Calendario de Reservas Diana
- Admin: Usuarios y Modales
- Landing: Sección Servicios
- Database Package
- TSConfig Raíz
- Backend: Beneficios
- Shared Types: Package
- Admin: Perfil Profesional
- Usuario: Calendario
- Admin: Beneficios
- Admin: Crear Profesional
- Admin: Descuentos
- SEO y Página 404
- Admin: Inscripciones
- Usuario: Layout
- Usuario: Membresías
- Usuario: Mis Servicios
- Landing: package.json
- Admin: Finanzas
- Reserva Pública
- Shared Types: API Requests
- Admin: Profesionales
- Shared Types: Enums
- Admin: Tarjetas de Usuario
- Backend: Tipos API
- Admin: Dashboard Principal
- Logo: Iconografía Médica
- Logo Medis: Marca Diana
- Script Cleanup Submenú
- Script Cleanup Final
- Favicon Bolt Legacy
- Login de Profesional
- Script Sidebar Menu 1
- Script Sidebar Menu 2
- Script Sidebar Menu 3
- Script Sidebar Menu 4
- Icono Legacy Teal/Coral
- Logo Legacy OPIEKA
- Landing: Sección About
- Admin: Crear Sede
- Admin: Crear Sala
- Landing: Perfil Doctora
- Landing: Navbar
- Config Package
- Assets React/Vite
- Spec Registro: SISPRO
- Script Fix Sidebar
- Icono Favicon Molecular
- Landing: Testimonios
- Landing: TSConfig Refs
- Script Update Sidebar
- Backend: Rutas Servicios
- Spec Categorías: OfferType
- ESLint React Refresh
- Zod
- Types Node
- Types React
- TypeScript Dep
- Sprite Iconos Sociales
- Vite
- Docs: Monorepo Workspaces
- Spec Campos de Registro
- Flujo: Despliegue

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `pool` - 20 edges
3. `compilerOptions` - 17 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 14 edges
6. `authenticate()` - 13 edges
7. `UserMembershipRepository` - 13 edges
8. `CLAUDE.md — Índice maestro Medis Diana` - 13 edges
9. `compilerOptions` - 12 edges
10. `compilerOptions` - 12 edges

## Surprising Connections (you probably didn't know these)
- `QUICKSTART.md — medisdiana Quick Start` --semantically_similar_to--> `README.md — Acaripole Monorepo`  [INFERRED] [semantically similar]
  QUICKSTART.md → README.md
- `Paleta morado→azul del rebranding (#8B5CF6 → #3B82F6, acento #38BDF8)` --semantically_similar_to--> `Paleta blanco/azul (#FFFFFF, #F5F7FA, #1D4ED8, #2563EB, #0EA5E9)`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-06-10-landing-rebranding-medica-design.md → convenciones.md
- `Legacy Purple/Violet Branding Asset (pre-medical rebrand)` --conceptually_related_to--> `Paleta blanco/azul (#FFFFFF, #F5F7FA, #1D4ED8, #2563EB, #0EA5E9)`  [INFERRED]
  medisdiana-landing/src/assets/hero.png → convenciones.md
- `Decisión: servicios clínicos gestionados desde CuidameDoc` --semantically_similar_to--> `Comportamiento: fallback cuando Diana no tiene servicios configurados`  [INFERRED] [semantically similar]
  decisiones.md → errores-conocidos.md
- `5 categorías médicas de servicios (Promoción y Prevención, ENT, Sobrepeso, Salud de la Mujer, Salud Mental)` --semantically_similar_to--> `Decisión: servicios clínicos gestionados desde CuidameDoc`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-06-14-categorias-servicios-medicos-design.md → decisiones.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Sistema de documentación indexada Medis Diana** — claude, arquitectura, convenciones, glosario, decisiones, flujo_de_trabajo, errores_conocidos [EXTRACTED 1.00]
- **Documentación legacy de la plataforma medisdiana original** — docs_api, docs_architecture, docs_contributing, docs_database, docs_setup, quickstart, readme [INFERRED 0.85]
- **Integración de agendamiento con CuidameDoc** — arquitectura_dianabookingcalendar, arquitectura_flujo_booking, arquitectura_doc_api, glosario_cuidamedoc, glosario_professional_id_12, glosario_clinical_service_id, glosario_prof_service_id, decisiones_agendamiento_delegado [EXTRACTED 1.00]
- **Shared Packages of the medisdiana pnpm Monorepo** — packages_config_readme_shared_configuration, packages_database_readme_database_package, packages_shared_types_readme_shared_types_package, packages_ui_components_readme_ui_components_library, pnpm_workspace_monorepo_workspace [EXTRACTED 1.00]
- **SEO and Discoverability Setup for dianamedic.cuidame.tech** — medisdiana_landing_index_seo_metadata, medisdiana_landing_public_robots_crawl_policy, medisdiana_landing_public_robots_sitemap, medisdiana_landing_index_google_tag_manager [INFERRED 0.85]

## Communities (101 total, 20 thin omitted)

### Community 0 - "Backend: Config y Autenticación"
Cohesion: 0.06
Nodes (49): Env, requiredEnvVars, login(), logout(), me(), refresh(), register(), createDianaAppointment() (+41 more)

### Community 1 - "Documentación del Proyecto"
Cohesion: 0.07
Nodes (46): Arquitectura — Medis Diana, DianaBookingCalendar (componente de agendamiento), CuidameDoc API (doc-api.cuidame.tech/api), Flujo de booking: service → calendar → slots → form → success, CLAUDE.md — Índice maestro Medis Diana, Convenciones — Medis Diana, Paleta blanco/azul (#FFFFFF, #F5F7FA, #1D4ED8, #2563EB, #0EA5E9), Regla de tematización médica (nunca pole dance) (+38 more)

### Community 2 - "Backend: Base de Datos y Seeds"
Cohesion: 0.09
Nodes (31): client, hashPassword(), seedAdmin(), disconnectDatabase(), pool, checkAvailability(), createProfessional(), deleteProfessional() (+23 more)

### Community 3 - "Backend: Dependencias"
Cohesion: 0.05
Nodes (43): dependencies, dotenv, express, jsonwebtoken, @medisdiana/shared-types, nodemailer, pg, devDependencies (+35 more)

### Community 4 - "Backend: TSConfig"
Cohesion: 0.05
Nodes (43): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations, lib (+35 more)

### Community 5 - "Admin: Formularios de Servicio"
Cohesion: 0.09
Nodes (26): C, NAV_ITEMS, C, FormularioServicio(), Props, baseSchema, DIA_JS_DAY, DIA_LABELS (+18 more)

### Community 6 - "Backend: Servidor y Arranque"
Cohesion: 0.12
Nodes (15): connectDatabase(), main(), errorHandler(), router, createServer(), startServer(), AppError, ConflictError (+7 more)

### Community 7 - "Portal Profesional: Agenda"
Cohesion: 0.09
Nodes (26): addDays(), authH(), C, DAY_SHORT, fmtPrice(), fmtTime(), getMondayOf(), isSameDay() (+18 more)

### Community 8 - "Backend: Controlador de Servicios"
Cohesion: 0.18
Nodes (27): confirmServicePayment(), createBookingRequest(), createBulkBookingRequests(), createOffer(), createRoom(), deleteOffer(), deleteServicePayment(), getAllRooms() (+19 more)

### Community 9 - "Admin: Formulario de Sedes"
Cohesion: 0.10
Nodes (19): BlockFieldArray, C, DayKey, DAYS, DayScheduleRowProps, FormularioSede(), FormularioSedeProps, SedeCardProps (+11 more)

### Community 10 - "Backend: Membresías"
Cohesion: 0.15
Nodes (18): createMembership(), deleteMembership(), getMembership(), listActiveMemberships(), listMemberships(), updateMembership(), MembershipRepository, CreateMembershipDto (+10 more)

### Community 11 - "Docs Backend y SEO Landing"
Cohesion: 0.09
Nodes (26): Clean Architecture (Controllers, Services, Repositories), Backend Environment Variables (DATABASE_URL, JWT_SECRET, CORS_ORIGIN, PORT 3007), GET /api/health Endpoint, JWT Authentication, Medisdiana Backend (Express.js Server), PostgreSQL Database, Dra. Diana Cristina Medina Camargo (Especialista en Medicina Familiar), Google Fonts (Bodoni Moda, Hanken Grotesk) (+18 more)

### Community 12 - "Backend: Membresías de Usuario"
Cohesion: 0.17
Nodes (23): confirmPayment(), deletePlan(), getActiveMemberships(), getMyActiveInscription(), getMyActiveMembership(), getMyMembershipHistory(), getPendingMemberships(), purchaseMembership() (+15 more)

### Community 13 - "App React: Rutas Principales"
Cohesion: 0.08
Nodes (16): AdminClasses, BeneficiosDashboard, CreateService, DescuentosDashboard, EspaciosDashboard, FinanzasDashboard, InscripcionesDashboard, InventarioDashboard (+8 more)

### Community 14 - "UI Components: Dependencias"
Cohesion: 0.08
Nodes (25): dependencies, react, react-dom, devDependencies, eslint, prettier, tailwindcss, @types/react (+17 more)

### Community 15 - "Tipos Compartidos de Servicios"
Cohesion: 0.12
Nodes (20): BookingRequestPublic, BookingRequestStatus, CreateBookingRequestPayload, CreateRoomPayload, CreateServiceCatalogPayload, CreateServiceOfferPayload, LocationSummary, OfferStatus (+12 more)

### Community 16 - "Landing: TSConfig App"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 17 - "Monorepo: package.json Raíz"
Cohesion: 0.09
Nodes (22): description, devDependencies, turbo, turbo, name, typescript, packageManager, pnpm (+14 more)

### Community 18 - "Turbo: Pipeline de Build"
Cohesion: 0.09
Nodes (22): ^build, **/.env, **/.env.*.local, .next/**, dependsOn, outputs, cache, persistent (+14 more)

### Community 19 - "UI Components: TSConfig"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module (+13 more)

### Community 20 - "Admin: Calendario de Citas"
Cohesion: 0.14
Nodes (19): addDays(), AdminClasses(), APPT_TYPES, C, DAY_SHORT, fmtPrice(), fmtTime(), getMondayOf() (+11 more)

### Community 21 - "Landing: TSConfig Node"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+12 more)

### Community 22 - "Backend: Sedes y Horarios"
Cohesion: 0.16
Nodes (16): createLocation(), deleteLocation(), flattenOperatingHours(), getLocations(), IncomingDaySchedule, updateLocation(), getOperatingHours(), upsertOperatingHours() (+8 more)

### Community 23 - "Landing: Dependencias UI"
Cohesion: 0.11
Nodes (19): framer-motion, @hookform/resolvers, lucide-react, dependencies, framer-motion, @hookform/resolvers, lucide-react, react (+11 more)

### Community 24 - "Usuario: Servicios"
Cohesion: 0.15
Nodes (18): ActiveMembership, authH(), C, CategoryCredit, DAY_NAMES_SHORT, DAY_ORDER, fmtDateShort(), fmtPrice() (+10 more)

### Community 25 - "Backend: Descuentos"
Cohesion: 0.23
Nodes (13): createDiscount(), deleteDiscount(), listActiveDiscounts(), listDiscounts(), listSpecialties(), updateDiscount(), validateDiscount(), DiscountRepository (+5 more)

### Community 26 - "Admin: Sidebar e Inventario"
Cohesion: 0.13
Nodes (16): AdminSidebar(), C, INFRA_SUBITEMS, NAV_ITEMS, NavItem, Props, C, CATEGORIES (+8 more)

### Community 27 - "Shared Types: TSConfig"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir (+9 more)

### Community 28 - "Landing: ESLint DevDeps"
Cohesion: 0.12
Nodes (17): @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, globals (+9 more)

### Community 29 - "Admin: Espacios"
Cohesion: 0.16
Nodes (11): C, NAV_ITEMS, Espacio, EspacioResource, ModalEspacioState, C, FormularioEspacio(), FormularioEspacioProps (+3 more)

### Community 30 - "Admin: Membresías"
Cohesion: 0.15
Nodes (14): authHeaders(), C, EMPTY_FORM, fmt(), formatPrice(), inputStyle(), Membership, MembershipType (+6 more)

### Community 31 - "Calendario de Reservas Diana"
Cohesion: 0.14
Nodes (15): BookingForm, BookingStep, C, DAYS_ES, DianaBookingCalendar(), DianaBookingCalendarProps, formatDateLong(), formatTime() (+7 more)

### Community 32 - "Admin: Usuarios y Modales"
Cohesion: 0.14
Nodes (10): ConfirmationModal(), ConfirmationModalProps, authHeaders(), C, FilterPillProps, NAV_ITEMS, RoleFilter, StatCardProps (+2 more)

### Community 33 - "Landing: Sección Servicios"
Cohesion: 0.18
Nodes (12): CARD_STYLES, CLASSES, EASE, FALLBACK_SERVICES, Footer(), SOCIAL, CATEGORY_LABEL, categoryLabel() (+4 more)

### Community 34 - "Database Package"
Cohesion: 0.12
Nodes (15): dependencies, pg, devDependencies, tsx, @types/node, typescript, pg, tsx (+7 more)

### Community 35 - "TSConfig Raíz"
Cohesion: 0.12
Nodes (15): ./packages/*/src, compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib (+7 more)

### Community 36 - "Backend: Beneficios"
Cohesion: 0.28
Nodes (11): createBenefit(), deleteBenefit(), listBenefits(), updateBenefit(), VALID_CATEGORIES, VALID_TYPES, BenefitPublic, BenefitRecord (+3 more)

### Community 37 - "Shared Types: Package"
Cohesion: 0.13
Nodes (14): devDependencies, eslint, prettier, typescript, exports, eslint, prettier, typescript (+6 more)

### Community 38 - "Admin: Perfil Profesional"
Cohesion: 0.16
Nodes (11): authHeaders(), C, DIAS, DISCIPLINES, EditForm, ID_TYPES, Professional, ProfessionalProfileModal() (+3 more)

### Community 39 - "Usuario: Calendario"
Cohesion: 0.21
Nodes (12): addDays(), authH(), C, DAY_SHORT, fmtTime(), getMondayOf(), getMonthGrid(), isSameDay() (+4 more)

### Community 40 - "Admin: Beneficios"
Cohesion: 0.21
Nodes (12): authHeaders(), autoName(), BeneficiosDashboard(), Benefit, BenefitType, C, CATEGORY_META, formatBenefitTag() (+4 more)

### Community 41 - "Admin: Crear Profesional"
Cohesion: 0.17
Nodes (12): AccountRole, C, CreateProfessionalModal(), DIAS, DISCIPLINES, FormData, ID_TYPES, passwordStrength() (+4 more)

### Community 42 - "Admin: Descuentos"
Cohesion: 0.21
Nodes (11): adminHeaders(), C, DescuentosDashboard(), DiscountPublic, DiscountType, EMPTY_FORM, fmtCOP(), FormState (+3 more)

### Community 43 - "SEO y Página 404"
Cohesion: 0.24
Nodes (6): MedicalClinicJsonLd(), buildMedicalClinicSchema(), TODO: Replace TODO_ placeholders (addressLocality, streetAddress, telephone), SEO_CONFIG, Seo(), SeoProps

### Community 44 - "Admin: Inscripciones"
Cohesion: 0.25
Nodes (10): authH(), C, fmtDate(), fmtPrice(), fmtTime(), InscripcionesDashboard(), NAV_ITEMS, Request (+2 more)

### Community 45 - "Usuario: Layout"
Cohesion: 0.24
Nodes (9): authH(), C, Me, NAV, UserLayout(), authH(), C, Props (+1 more)

### Community 46 - "Usuario: Membresías"
Cohesion: 0.25
Nodes (10): ActiveMembership, authH(), C, classBadge(), CONFIRM_STEPS, fmtDate(), fmtPrice(), Plan (+2 more)

### Community 47 - "Usuario: Mis Servicios"
Cohesion: 0.22
Nodes (10): authH(), C, fmtTime(), MONTH_NAMES, Props, Request, STATUS_CFG, TYPE_COLOR (+2 more)

### Community 48 - "Landing: package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 49 - "Admin: Finanzas"
Cohesion: 0.24
Nodes (8): ActiveMembership, adminHeaders(), C, FinanzasDashboard(), fmt(), NAV_ITEMS, PendingMembership, PendingServicePayment

### Community 50 - "Reserva Pública"
Cohesion: 0.24
Nodes (9): BookingFormState, C, DiscountValidation, EMPTY_FORM, formatOfferDateTime(), formatOfferPrice(), PublicBooking(), PublicBookingProps (+1 more)

### Community 51 - "Shared Types: API Requests"
Cohesion: 0.20
Nodes (7): CreateUserRequest, LoginRequest, RegisterRequest, UpdateUserRequest, ApiError, ApiResponse, PaginatedResponse

### Community 52 - "Admin: Profesionales"
Cohesion: 0.25
Nodes (6): AdminProfessionals(), authHeaders(), C, NAV_ITEMS, Stats, UserCard

### Community 53 - "Shared Types: Enums"
Cohesion: 0.25
Nodes (6): HttpStatus, UserRole, UserStatus, AuthResponse, AuthToken, User

### Community 54 - "Admin: Tarjetas de Usuario"
Cohesion: 0.32
Nodes (5): User, ActionBtnProps, ROLE_CONFIG, UsuarioCard(), UsuarioCardProps

### Community 55 - "Backend: Tipos API"
Cohesion: 0.29
Nodes (4): ApiResponse, CreateUserDTO, UpdateUserDTO, User

### Community 56 - "Admin: Dashboard Principal"
Cohesion: 0.38
Nodes (6): authH(), C, isSameDay(), MainDashboard(), NAV_ITEMS, TodayService

### Community 57 - "Logo: Iconografía Médica"
Cohesion: 0.53
Nodes (6): Family Care (adult and child figures inside heart), Blue-to-Purple Gradient Palette (g1/g2/g3: #7BC8E8, #8B5CF6, #C084D8), Heartbeat / EKG Line, Home and Growth Motif (house outline with tree), Medical Cross Symbol, Logo Icon SVG (tree, house with medical cross, heart with family and heartbeat)

### Community 58 - "Logo Medis: Marca Diana"
Cohesion: 0.53
Nodes (6): Dra. Diana Cristina Medina Camargo, Family health iconography (tree of life, house with medical cross, heart with family figures, EKG line), Logo iconography: tree, house, heart with family figures, medical cross, heartbeat line, Logo Medis - Personal brand logo of Dra. Diana Cristina Medina Camargo: a purple-to-blue gradient emblem combining a tree of life growing from a house with a medical cross, a heart enclosing a family (adult and child figures) and an EKG heartbeat line, next to handwritten-style name lettering, Especialista en Medicina Familiar y Comunitaria, Purple/blue gradient brand palette used in the logo

### Community 60 - "Script Cleanup Submenú"
Cohesion: 0.40
Nodes (4): dir, files, fs, path

### Community 61 - "Script Cleanup Final"
Cohesion: 0.40
Nodes (4): dir, files, fs, path

### Community 62 - "Favicon Bolt Legacy"
Cohesion: 0.40
Nodes (5): index.html (app entry HTML; links /icon.svg as favicon, not favicon.svg), favicon.svg — Purple Lightning Bolt Icon, Bolt.new Scaffold Template Branding (leftover default favicon), Lightning Bolt Logo Mark (double-zigzag bolt, purple #863bff / #7e14ff with lavender #ede6ff and cyan #47bfff blurred gradient blobs), Palette Conflict: purple/violet icon vs project white/blue medical branding convention

### Community 63 - "Login de Profesional"
Cohesion: 0.40
Nodes (3): ArtistLoginProps, C, EASE

### Community 64 - "Script Sidebar Menu 1"
Cohesion: 0.40
Nodes (4): dir, files, fs, path

### Community 65 - "Script Sidebar Menu 2"
Cohesion: 0.40
Nodes (4): dir, files, fs, path

### Community 66 - "Script Sidebar Menu 3"
Cohesion: 0.40
Nodes (4): dir, files, fs, path

### Community 67 - "Script Sidebar Menu 4"
Cohesion: 0.40
Nodes (4): dir, files, fs, path

### Community 68 - "Icono Legacy Teal/Coral"
Cohesion: 0.67
Nodes (4): Landing App Icon (icon.svg), Medisdiana Landing Branding, Molecule / Atomic Cluster Motif, Teal (#44cfcb) and Coral (#f9564f) Color Palette

### Community 69 - "Logo Legacy OPIEKA"
Cohesion: 0.67
Nodes (4): Flower/Molecule Emblem (teal pinwheel paths with coral dots), Legacy Brand Palette (teal #44cfcb / coral #f9564f), Opieka Logo (legacy brand SVG), OPIEKA Wordmark (six teal glyph paths)

### Community 74 - "Landing: Navbar"
Cohesion: 0.50
Nodes (3): links, Navbar(), NavbarProps

### Community 75 - "Config Package"
Cohesion: 0.50
Nodes (3): description, name, version

### Community 76 - "Assets React/Vite"
Cohesion: 0.67
Nodes (3): React (UI Library), Vite React Starter Template, React Logo SVG (atom icon, cyan #00D8FF)

### Community 78 - "Spec Registro: SISPRO"
Cohesion: 0.67
Nodes (3): Tabla users (PostgreSQL), Credenciales SISPRO (sispro_username / sispro_password_hash), Migración 017_registration_identity_fields.sql (columnas de identidad en users)

### Community 80 - "Icono Favicon Molecular"
Cohesion: 1.00
Nodes (3): Site Favicon / Brand Mark (medisdiana-landing), Icon Color Palette (teal #44cfcb / coral #f9564f), icon.svg - Molecular Network Logo Icon

## Ambiguous Edges - Review These
- `Hero()` → `Hero Illustration (Isometric Purple Platforms)`  [AMBIGUOUS]
  medisdiana-landing/src/assets/hero.png · relation: references
- `favicon.svg — Purple Lightning Bolt Icon` → `index.html (app entry HTML; links /icon.svg as favicon, not favicon.svg)`  [AMBIGUOUS]
  medisdiana-landing/public/favicon.svg · relation: references
- `Site Favicon / Brand Mark (medisdiana-landing)` → `Icon Color Palette (teal #44cfcb / coral #f9564f)`  [AMBIGUOUS]
  medisdiana-landing/public/icon.svg · relation: conceptually_related_to
- `Medical Cross Symbol` → `Blue-to-Purple Gradient Palette (g1/g2/g3: #7BC8E8, #8B5CF6, #C084D8)`  [AMBIGUOUS]
  medisdiana-landing/public/logo-icon.svg · relation: conceptually_related_to
- `Teal (#44cfcb) and Coral (#f9564f) Color Palette` → `Medisdiana Landing Branding`  [AMBIGUOUS]
  medisdiana-landing/src/assets/icon.svg · relation: conceptually_related_to

## Knowledge Gaps
- **548 isolated node(s):** `name`, `version`, `type`, `dev`, `build` (+543 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Hero()` and `Hero Illustration (Isometric Purple Platforms)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `favicon.svg — Purple Lightning Bolt Icon` and `index.html (app entry HTML; links /icon.svg as favicon, not favicon.svg)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Site Favicon / Brand Mark (medisdiana-landing)` and `Icon Color Palette (teal #44cfcb / coral #f9564f)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Medical Cross Symbol` and `Blue-to-Purple Gradient Palette (g1/g2/g3: #7BC8E8, #8B5CF6, #C084D8)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Teal (#44cfcb) and Coral (#f9564f) Color Palette` and `Medisdiana Landing Branding`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `pool` connect `Backend: Base de Datos y Seeds` to `Backend: Config y Autenticación`, `Backend: Beneficios`, `Backend: Servidor y Arranque`, `Backend: Controlador de Servicios`, `Backend: Membresías`, `Tipos Compartidos de Servicios`, `Backend: Sedes y Horarios`, `Backend: Descuentos`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _548 weakly-connected nodes found - possible documentation gaps or missing edges._