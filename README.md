# 🎯 Brand Citability v2.1

**Herramienta multi-modelo para medir citaciones de marca en respuestas de Large Language Models**

[![Deploy con Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jairoamaya/brand-citability)

> Desarrollado por [Jairo Amaya](https://jairoamaya.co) — Full Stack Marketer & SEO Specialist  
> Bogotá, Colombia

---

## 📊 ¿Qué mide esta herramienta?

**Brand Citability** es el grado en que una marca aparece mencionada cuando usuarios consultan Large Language Models (Claude, ChatGPT, Gemini, Perplexity) sobre productos o servicios de su industria.

Esta herramienta evalúa:

- ✅ **Citabilidad orgánica**: % de veces que la marca aparece sin ser nombrada en la pregunta
- ✅ **Liderazgo semántico**: % de veces que la marca es mencionada primero
- ✅ **Autoridad dirigida**: Desempeño cuando la marca es consultada directamente
- ✅ **Citation Graph**: Grafo semántico de relaciones marca-categoría-atributos
- ✅ **Comparativa multi-modelo**: Gemini vs Claude vs ChatGPT vs Perplexity

---

## 🚀 Deploy Rápido

### Opción 1: Vercel (recomendado)

```bash
git clone https://github.com/jairoamaya/brand-citability.git
cd brand-citability
vercel --prod
```

### Opción 2: GitHub Pages

1. Fork este repo
2. Settings → Pages → Source: rama `main`
3. Listo: `https://tu-usuario.github.io/brand-citability`

### Opción 3: Local

```bash
# Abrir directamente
open index.html

# O con servidor local
python3 -m http.server 8000
# Abrir http://localhost:8000
```

---

## 🔧 Configuración

### API Keys

**Claude (recomendado):**
- Requiere proxy PHP para evitar CORS
- Proxy incluido en `claude-proxy.php`
- Deploy proxy en tu servidor y actualiza URL en Config

**ChatGPT:**
- API key de OpenAI: https://platform.openai.com/api-keys
- Costo: ~$0.01-0.03 USD por estudio de 30 preguntas

**Perplexity:**
- API key: https://www.perplexity.ai/settings/api
- Modelo: `sonar-pro`

**Gemini (sin API key):**
- Usa proxy público en `jairoamaya.co/gemini-proxy.php`
- O despliega tu propio proxy

### Supabase (persistencia)

Los estudios se guardan en Supabase. Para usar tu propia instancia:

1. Crea proyecto en https://supabase.com
2. Ejecuta schema SQL:

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

3. Actualiza credenciales en `index.html`:

```javascript
const CIA_SB_URL = 'https://TU-PROYECTO.supabase.co';
const CIA_SB_KEY = 'TU_ANON_KEY';
```

---

## 📖 Uso

### 1. Configurar Estudio

- **Industria**: Retail, Banca, Salud, Tecnología, o personalizada
- **Marcas**: Mínimo 2, máximo 10 (una por línea)
- **País**: Colombia, México, España, etc.
- **Preguntas**: 10-75 (recomendado: 30)

### 2. Activar Modelos

En la pestaña **Modelos**, activa los LLMs que quieres incluir:

- **Gemini** ✦ (siempre disponible vía proxy)
- **Claude** ◎ (requiere proxy PHP)
- **ChatGPT** 💬 (requiere API key OpenAI)
- **Perplexity** ◈ (requiere API key)

Cada modelo puede ejecutarse en:
- **API Auto**: llamadas automáticas
- **Manual**: copias pregunta, pegas respuesta
- **Simulado**: Gemini simula responder como consumidor

### 3. Ejecutar

Click en **⚡ Ejecutar Estudio**

**Workflow (5 pasos):**
1. Genera preguntas (5 bloques: A→B→C→D→E)
2. Evalúa con cada modelo activado
3. Extrae menciones y marca primera
4. Construye ranking de citabilidad
5. Genera Citation Graph semántico

### 4. Resultados

Cada modelo muestra:
- **Ranking de citabilidad** (orgánico vs dirigido)
- **Hallazgo principal** + patrón + recomendación
- **Detalle por marca** con nivel (Alta/Media/Baja)

**Comparativa multi-modelo** muestra:
- Tabla cruzada de menciones por marca
- Citation Graph interactivo (SVG)
- Semantic Authority score por marca

**Exportar:**
- JSON completo (preguntas + respuestas + grafo)
- CSV ranking
- **PDF profesional** (cover + resultados + metodología)

---

## 🧠 Metodología

### Bloques de Preguntas

El estudio genera preguntas en 5 categorías:

- **Bloque A** (20%): Intención general — "¿Cuáles son los mejores bancos?"
- **Bloque B** (20%): Conversacional 6W — Quién/Qué/Dónde/Cuándo/Cómo/Por qué
- **Bloque C** (20%): Consulta directa — "¿Qué ofrece Bancolombia?"
- **Bloque D** (20%): Comparaciones — "Bancolombia vs Davivienda"
- **Bloque E** (20%): Evergreen — "¿Cómo elegir un banco?"

**CRÍTICO**: Los bloques A, B y E **NO mencionan marcas** en las preguntas → miden citabilidad orgánica pura.

### Extracción de Menciones

Usa **triple estrategia**:

1. Parse JSON del modelo (si devuelve `marcas_mencionadas`)
2. Word-overlap con normalización (maneja variantes: "Bancolombia S.A." → "Bancolombia")
3. Regex con word boundaries para detectar menciones textuales

### Citation Graph

Gemini analiza las respuestas y construye un grafo semántico con:

- **Nodos**: marcas, categorías, atributos, entidades
- **Edges**: relaciones (pertenece_a, compite_con, se_asocia_con)
- **Semantic Authority**: score por marca según nodos activados + conceptos exclusivos

**Fallback robusto**: Si Gemini devuelve JSON malformado, la herramienta construye un grafo mínimo válido y completa el estudio.

---

## 🎨 Frameworks Propietarios

Esta herramienta implementa los siguientes frameworks de Jairo Amaya:

### 1. **Agentive Visibility**
Mide qué tan visible es una marca cuando agentes IA responden preguntas de usuarios reales.

### 2. **Soberanía Semántica**
Control sobre el espacio semántico que una marca activa en modelos de lenguaje. Una marca con alta soberanía semántica "posee" conceptos clave en su categoría.

### 3. **Protocolo Posición Cero™**
Metodología de auditoría multi-capa para detectar gaps entre calidad técnica e inteligibilidad para IA.

### 4. **4 Territorios Semánticos**
Framework para clasificar presencia de marca en respuestas IA:
- Territorio 1: Mención espontánea
- Territorio 2: Mención tras consulta directa
- Territorio 3: Mención en comparativa
- Territorio 4: Ausencia total

---

## 🛠️ Stack Técnico

- **Frontend**: HTML5, CSS3 (custom design system), Vanilla JavaScript
- **Visualización**: SVG nativo (grafo force-directed)
- **Persistencia**: Supabase (PostgreSQL)
- **APIs**: Anthropic Claude, OpenAI GPT-4o, Google Gemini, Perplexity
- **Export**: JSON, CSV, PDF (generación client-side)
- **Deploy**: Vercel, GitHub Pages, o self-hosted

---

## 📂 Estructura del Proyecto

```
brand-citability/
├── index.html              # Aplicación completa (HTML + CSS + JS)
├── claude-proxy.php        # Proxy CORS para API Claude
├── gemini-proxy.php        # Proxy para Google Gemini
├── package.json
├── README.md
├── DEPLOY.md               # Guía de deployment
├── BRANDING.md             # Estrategia de marca
├── LICENSE
└── .gitignore
```

---

## 🔐 Seguridad

- ❌ **NO** incluyas API keys en el código fuente
- ✅ Usa variables de entorno para producción
- ✅ Los proxies PHP validan origen y rate-limit
- ✅ Supabase usa Row Level Security (RLS)
- ✅ Los datos de estudios son privados por usuario

**Para deploy público**:
- Implementa autenticación (Supabase Auth)
- Habilita RLS en tabla `cia_estudios`
- Rate-limit en proxies PHP

---

## 🤝 Contribuir

Este es un proyecto de código abierto. Pull requests bienvenidos para:

- 🐛 Corrección de bugs
- ✨ Nuevas funcionalidades
- 📝 Mejoras de documentación
- 🎨 Mejoras de UI/UX

**NO se aceptan PRs que**:
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
- Reporting mensual de citabilidad
- Identificar gaps de contenido evergreen

### Brands & CMOs
- Medir ROI de estrategia AEO/GEO
- Detectar pérdida de autoridad semántica
- Priorizar inversión en territorios

### Consultores SEO
- Auditoría de visibilidad en IA para clientes
- Producto premium: "Reporte de Citabilidad IA"
- Upsell desde auditoría SEO tradicional

---

## 🚧 Roadmap

- [ ] Integración con DeepSeek y Grok
- [ ] Export a Google Sheets
- [ ] API REST para integración externa
- [ ] Dashboard analytics histórico
- [ ] Alertas de cambio de ranking
- [ ] Benchmarks por industria (datos agregados)

---

**⭐ Si esta herramienta te resulta útil, da una estrella al repo y comparte con tu red**
