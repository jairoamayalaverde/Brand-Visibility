# 🎯 Brand Citability v4.2

**Herramienta multi-modelo para medir citaciones de marca en respuestas de Large Language Models con enriquecimiento comercial**

[![Deploy con Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jairoamaya/brand-citability)

> Desarrollado por [Jairo Amaya](https://jairoamaya.co) — Full Stack Marketer & SEO Specialist  
> Bogotá, Colombia

---

## 📊 ¿Qué mide esta herramienta?

**Brand Citability** es el grado en que una marca aparece mencionada cuando usuarios consultan Large Language Models (Claude, ChatGPT, Gemini, Perplexity) sobre productos o servicios de su industria.

### ✨ **NUEVO en v4.2: Enriquecimiento Comercial**

Además del análisis básico de citabilidad, la v4.2 incluye:

- **🎯 Score Comercial por Pregunta**: Clasifica cada pregunta por volumen estimado, intento de búsqueda, valor de negocio y formato ideal
- **📊 Performance Metrics**: Share of voice, gap vs líder, menciones perdidas, eficiencias orgánica/dirigida/total
- **🚀 Quick Wins**: Identifica oportunidades de territorio baldío (preguntas sin competencia)
- **⚔️ Amenaza Competitiva**: Detecta cuál competidor domina las primeras menciones
- **📄 Reportes HTML Profesionales**: Genera reportes standalone para clientes con diseño editorial

---

## 🚀 Deploy Rápido

### Opción 1: Vercel (recomendado)

```bash
git clone https://github.com/jairoamaya/brand-citability.git
cd brand-citability
vercel --prod
```

**Configurar subdominio personalizado:**
1. Vercel Dashboard → Tu proyecto → Settings → Domains
2. Add Domain: `citability.tudominio.com`
3. Agregar CNAME en tu DNS apuntando a `cname.vercel-dns.com`

### Opción 2: Self-hosted

```bash
# Subir archivos al servidor
brand-citability-production.html
report-template-pro.html
gemini-proxy.php
claude-proxy.php

# Acceder vía: https://tudominio.com/brand-citability-production.html
```

### Opción 3: Local (desarrollo)

```bash
# Servidor local
python3 -m http.server 8000
# Abrir http://localhost:8000/brand-citability-production.html
```

---

## 🔧 Configuración

### 1. Proxies PHP

**Gemini Proxy** (`gemini-proxy.php`):
```php
$apiKey = 'TU_GEMINI_API_KEY'; // Google AI Studio
$model = 'gemini-2.5-flash';
```

**Claude Proxy** (`claude-proxy.php`):
```php
$apiKey = 'TU_ANTHROPIC_API_KEY'; // console.anthropic.com
$model = 'claude-sonnet-4-6';
```

Despliega ambos proxies en tu servidor y actualiza las URLs en la pestaña **Config** de la herramienta.

### 2. API Keys (Modelos Adicionales)

**ChatGPT:**
- API key de OpenAI: https://platform.openai.com/api-keys
- Costo: ~$0.01-0.03 USD por estudio de 30 preguntas

**Perplexity:**
- API key: https://www.perplexity.ai/settings/api
- Modelo: `sonar-pro`

### 3. Supabase (Persistencia)

Crea proyecto en https://supabase.com y ejecuta:

```sql
CREATE TABLE cia_estudios (
  id BIGSERIAL PRIMARY KEY,
  industria TEXT NOT NULL,
  pais TEXT NOT NULL,
  marcas TEXT NOT NULL,
  num_modelos INT NOT NULL,
  num_preguntas INT NOT NULL,
  ganador TEXT,
  data JSONB NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cia_created ON cia_estudios(created_at DESC);
CREATE INDEX idx_cia_industria ON cia_estudios(industria);
```

Actualiza credenciales en `brand-citability-production.html` (líneas 1777-1778):

```javascript
const CIA_SB_URL = 'https://TU-PROYECTO.supabase.co';
const CIA_SB_KEY = 'TU_ANON_KEY';
```

---

## 📖 Uso

### 1. Configurar Estudio

**Pestaña Estudio:**
- **Industria**: Retail, Banca, Salud, Tecnología, o personalizada
- **Marcas**: Mínimo 2, máximo 10 (una por línea)
- **País**: Colombia, México, España, etc.
- **Preguntas**: 10-75 (recomendado: 30)

### 2. Activar Modelos

**Pestaña Modelos** — activa los LLMs que quieres incluir:

- **Gemini** ✦ (vía proxy PHP)
- **Claude** ◎ (vía proxy PHP)
- **ChatGPT** 💬 (API key OpenAI)
- **Perplexity** ◈ (API key)
- **Custom** ⊕ (cualquier endpoint compatible OpenAI)

Cada modelo tiene 3 modos:
- **API Auto**: llamadas automáticas
- **Manual**: copias pregunta, pegas respuesta
- **Simulado**: Gemini simula responder como consumidor (solo Gemini)

### 3. Ejecutar

Click en **⚡ Ejecutar Estudio**

**Workflow (5 pasos):**
1. ✅ Genera preguntas (bloques A→B→C→D→E)
2. ✅ Evalúa con cada modelo activado
3. ✅ Extrae menciones + enriquecimiento comercial
4. ✅ Construye ranking con performance metrics
5. ✅ Genera Citation Graph semántico

### 4. Resultados

**Por cada modelo:**
- Ranking de citabilidad (orgánico vs dirigido)
- Hallazgo principal + patrón detectado + recomendación
- Detalle por marca con nivel (Alta/Media/Baja)

**Comparativa multi-modelo:**
- Tabla cruzada de menciones
- Citation Graph interactivo (SVG)
- Semantic Authority score

**Exportar:**
- **JSON enriquecido** (con metadata comercial completa)
- **CSV ranking** (menciones, primera, % aparición, % liderazgo)
- **📄 Reporte HTML** (standalone con diseño editorial profesional)

---

## 🧠 Metodología

### Bloques de Preguntas

- **Bloque A** (20%): Intención general — "¿Cuáles son los mejores bancos?"
- **Bloque B** (20%): Conversacional 6W — Quién/Qué/Dónde/Cuándo/Cómo/Por qué
- **Bloque C** (20%): Consulta directa — "¿Qué ofrece Bancolombia?"
- **Bloque D** (20%): Comparaciones — "Bancolombia vs Davivienda"
- **Bloque E** (20%): Evergreen — "¿Cómo elegir un banco?"

**CRÍTICO**: Los bloques A, B y E **NO mencionan marcas** → miden citabilidad orgánica pura.

### Enriquecimiento Comercial (v4.2)

Cada pregunta recibe metadata:

```json
{
  "volumen_estimado": "muy alto|alto|medio|bajo",
  "intento": "transaccional|comercial|navegacional|informacional",
  "valor_negocio": "critico|alto|medio|bajo",
  "formato_ideal": "calculadora|guia|comparativa|FAQ|articulo",
  "score_comercial": 0-100
}
```

Cada marca recibe performance metrics:

```json
{
  "share_of_voice_pct": 38,
  "gap_vs_lider": 0,
  "menciones_perdidas": 17,
  "eficiencia_organica": 100,
  "eficiencia_dirigida": 43,
  "eficiencia_total": 63
}
```

### Commercial Insights Globales

```json
{
  "total_preguntas_sin_marca": 11,
  "pct_preguntas_sin_marca": 55,
  "oportunidad_principal": "Territorio Baldío masivo",
  "quick_wins": [/* top 5 por score */],
  "amenaza_competitiva": {
    "marca": "Bancolombia",
    "primeras_menciones": 5,
    "dominancia_pct": 50
  }
}
```

---

## 🎨 Frameworks Propietarios

### 1. **Agentive Visibility**
Mide qué tan visible es una marca cuando agentes IA responden preguntas de usuarios reales.

### 2. **Soberanía Semántica**
Control sobre el espacio semántico que una marca activa en modelos de lenguaje. Una marca con alta soberanía semántica "posee" conceptos clave en su categoría.

### 3. **Protocolo Posición Cero™**
Metodología de auditoría multi-capa para detectar gaps entre calidad técnica e inteligibilidad para IA.

### 4. **4 Territorios Semánticos**
- **Territorio 1**: Mención espontánea (orgánica)
- **Territorio 2**: Mención tras consulta directa
- **Territorio 3**: Mención en comparativa
- **Territorio 4**: Ausencia total (territorio baldío)

---

## 🛠️ Stack Técnico

- **Frontend**: HTML5, CSS3 (custom premium design system), Vanilla JavaScript
- **Visualización**: SVG nativo (force-directed graph)
- **Persistencia**: Supabase (PostgreSQL + JSONB)
- **APIs**: Anthropic Claude, OpenAI GPT-4o, Google Gemini 2.5, Perplexity Sonar
- **Export**: JSON enriquecido, CSV, HTML reports
- **Deploy**: Vercel (recomendado), self-hosted PHP

**Sin dependencias externas** — cero npm packages, cero frameworks.

---

## 📂 Estructura del Proyecto

```
brand-citability/
├── brand-citability-production.html    # Herramienta principal (v4.2)
├── report-template-pro.html            # Template reportes HTML
├── claude-proxy.php                    # Proxy CORS para Claude API
├── gemini-proxy.php                    # Proxy para Google Gemini
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🔐 Seguridad

### Para Uso Personal (Repo Privado)

✅ OK incluir API keys hardcodeadas en archivos `.php`  
✅ Configurar repo como **PRIVADO** en GitHub  
✅ Supabase keys pueden ir en el HTML si es uso exclusivo tuyo

### Para Deploy Público

❌ **NUNCA** incluyas API keys en código fuente público  
✅ Mover credenciales a variables de entorno  
✅ Implementar rate limiting en proxies PHP  
✅ Habilitar Row Level Security (RLS) en Supabase

**Ejemplo: Variables de entorno en PHP**
```php
// gemini-proxy.php
$apiKey = getenv('GEMINI_API_KEY') ?: 'fallback-key';
```

```bash
# .htaccess
SetEnv GEMINI_API_KEY "tu-api-key-aqui"
```

---

## 💼 Modelo de Negocio

### Como Herramienta Interna (Done-For-You Service)

**Producto:** Brand Citability Analysis  
**Precio:** $1,500 - $2,500 USD  
**Entregable:** Reporte HTML + sesión estratégica 60min

**Workflow:**
1. Cliente contrata análisis
2. Ejecutas en herramienta (password-protected)
3. Exportas → 📄 Reporte HTML
4. Entregas vía email + sesión explicativa
5. Upsell: MOC, WebMCP, Retainer mensual

### White-Label para Agencias (Futuro)

**Modelo:** $5K setup + $8K/año OR 30% revenue share  
**Incluye:** Branding personalizado, soporte técnico, actualizaciones

---

## 🤝 Contribuir

Pull requests bienvenidos para:
- 🐛 Corrección de bugs
- ✨ Nuevas funcionalidades
- 📝 Mejoras de documentación
- 🎨 Mejoras de UI/UX

**NO se aceptan PRs que:**
- Eliminen marca de agua "jairoamaya.co"
- Cambien autoría del proyecto
- Violen términos de uso de APIs externas

---

## 📜 Licencia

**MIT License** — Libre para uso comercial y personal con atribución.

```
Copyright (c) 2025 Jairo Amaya

Se permite uso, copia, modificación y distribución con atribución.
Ver LICENSE para detalles completos.
```

---

## 📞 Contacto

**Jairo Amaya**  
Full Stack Marketer & SEO Specialist  
Bogotá, Colombia

- 🌐 Web: https://jairoamaya.co
- 📧 Email: contacto@jairoamaya.co
- 💼 LinkedIn: [Jairo Amaya](https://linkedin.com/in/jairoamaya)

---

## 🎯 Casos de Uso

### Agencias de Marketing
- Benchmark competitivo de marcas en IA
- Reporting mensual de citabilidad para clientes
- Identificar gaps de contenido evergreen
- **NUEVO:** Quick Wins report (territorio baldío)

### Brands & CMOs
- Medir ROI de estrategia AEO/GEO
- Detectar pérdida de autoridad semántica vs competencia
- Priorizar inversión en territorios de alto valor comercial
- **NUEVO:** Dashboard de amenaza competitiva

### Consultores SEO
- Auditoría de visibilidad en IA para clientes
- Producto premium: "Brand Citability Analysis" ($1,500-2,500)
- Upsell desde auditoría SEO tradicional
- **NUEVO:** Reportes HTML profesionales para clientes

---

## 🚧 Roadmap

**v4.3 (Q2 2025)**
- [ ] Integración con DeepSeek y Grok
- [ ] Modo "Stealth" para análisis de competencia anónimo
- [ ] Export a Google Sheets

**v5.0 (Q3 2025)**
- [ ] API REST para integración externa
- [ ] Dashboard analytics histórico
- [ ] Alertas de cambio de ranking
- [ ] Benchmarks por industria (datos agregados anónimos)

---

## 📈 Changelog

### v4.2 (Enero 2025)
- ✅ Sistema de enriquecimiento comercial (metadata + scores)
- ✅ Performance metrics por marca (share of voice, gaps, eficiencias)
- ✅ Commercial insights (quick wins, amenazas competitivas)
- ✅ Generación de reportes HTML profesionales
- ✅ Export inline en resultados (mejor UX)
- ❌ Eliminado export PDF (reemplazado por HTML)

### v2.1 (Diciembre 2024)
- Multi-modelo (Gemini, Claude, ChatGPT, Perplexity)
- Citation Graph semántico
- Historial en Supabase
- Export JSON/CSV

---

**⭐ Si esta herramienta te resulta útil, da una estrella al repo y comparte con tu red**
