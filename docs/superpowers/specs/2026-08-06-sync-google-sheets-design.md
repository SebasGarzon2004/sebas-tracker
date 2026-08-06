# Sincronizar gastos con Google Sheets en la nube

**Fecha:** 2026-08-06
**Estado:** Aprobado, pendiente de plan de implementación

## Propósito

Hoy "Mis Gastos" guarda todo únicamente en `localStorage` del iPhone de Sebas, sin backend ni nube — decisión explícita tomada al inicio del proyecto. Sebas ahora quiere dos cosas a la vez, con el mismo peso:

1. **Respaldo real**: que los gastos no vivan solo en un celular. Si pierde o cambia de iPhone, no perder el historial.
2. **Ver y analizar en la computadora**: poder abrir sus gastos en una hoja de cálculo desde la compu, para análisis o presupuestos que en el celular no son cómodos.

## Decisiones ya tomadas por Sebas

- **Destino:** Google Sheets (no iCloud/Numbers — Apple no ofrece una API pública equivalente a la de Google Sheets; usar iCloud de verdad requeriría CloudKit, cuenta de desarrollador de Apple de pago, y ni así da un archivo de hoja de cálculo real).
- **Momento de sync:** al instante, cada vez que se guarda un gasto en la app (no por lotes ni con botón manual).
- **Gastos anulados:** se reflejan también en Sheets (no queda un historial "congelado" que ignore las anulaciones).
- **Dirección del sync:** un solo sentido, de la app hacia Sheets. La app del celular sigue siendo la única fuente de verdad; Sheets es un espejo de lectura/análisis, no editable desde la compu de vuelta hacia la app.
- **Arquitectura de conexión:** un intermediario propio (no la app conectándose directo a Google, no un servicio externo tipo Zapier). Ver "Arquitectura" abajo para el porqué.

## Arquitectura

```
iPhone (PWA, Safari)  →  Worker propio (Cloudflare, gratis)  →  Google Sheets API
     [fuente de verdad]        [único que le habla a Google]      [espejo/análisis]
```

Se descartaron dos alternativas:

- **App conectada directo a Google (OAuth en el cliente):** más simple de construir, pero el login de Google necesita abrir una ventana emergente, y las apps instaladas en la pantalla de inicio del iPhone (modo standalone) manejan mal esas ventanas — riesgo real de sacar a Sebas de la app a medio login. El token de acceso además expira cada hora, obligando a reconectarse seguido.
- **Zapier/Make como intermediario ya existente:** rápido de armar, pero depende de un tercero externo con límites de plan gratuito y le da a otra empresa acceso a los datos de gastos de Sebas.

Se eligió un **Worker de Cloudflare** (gratis en el tier usado aquí) como intermediario propio:

- Sostiene una credencial de **cuenta de servicio de Google** (no la cuenta personal de Sebas), a la que se le da permiso de Editor sobre la hoja de cálculo específica compartiéndosela por su correo de cuenta de servicio.
- Expone endpoints HTTP simples que la app llama por `fetch`.
- La app nunca maneja tokens de Google ni pide login — para Sebas, usar la app se siente exactamente igual que hoy.

## Componentes

### 1. Worker (nuevo, vive fuera de este repo o en una carpeta `worker/` dentro de él — a decidir en el plan)

Dos endpoints, protegidos con un token compartido fijo (enviado como header desde la app):

- `POST /gasto` — recibe el gasto nuevo (id, fecha, categoría, pago, monto, nota) y hace `values.append` en la hoja, agregando una fila con Estado = "Activo".
- `POST /gasto/anular` — recibe el id de un gasto ya sincronizado y busca la fila por ese id (columna oculta de ID) para cambiar su Estado a "Anulado". No borra filas — evita depender de índices de fila que pueden desincronizarse.

### 2. Hoja de Google Sheets

Una fila por gasto, columnas: **Fecha, Categoría, Forma de pago, Monto, Nota, Estado, ID** (ID es interno, para que el Worker pueda encontrar la fila al anular; puede ocultarse en la vista de Sheets).

### 3. App (`index.html` / `logic.js`, cambios sobre lo existente)

- Al guardar un gasto (ya guarda en `localStorage` como hoy) y al anular uno, además se dispara un `fetch` al Worker correspondiente.
- Si el `fetch` falla (sin internet, o el Worker no responde), el gasto/anulación queda anotado en una **cola pendiente** guardada también en `localStorage` (no se pierde nada, y el usuario no ve ningún error ni tiene que hacer nada).
- Al abrir la app (o volver a primer plano) con internet disponible, se intenta vaciar la cola pendiente en orden — reintento automático y silencioso.
- El resto de la app (UI, gestos, diseño) no cambia.

## Manejo de errores / caso sin internet

- Guardar un gasto en el celular **nunca depende de internet** — eso sigue siendo instantáneo y local, igual que hoy.
- El envío a Sheets es un "además", no un requisito para que el gasto quede guardado.
- Fallos de red, del Worker, o de la API de Google Sheets caen todos en el mismo mecanismo de cola pendiente + reintento silencioso — sin mensajes de error visibles a Sebas ni pasos manuales.

## Seguridad — límite aceptado, no un descuido

El código de la app es público en GitHub. El token compartido que la app usa para autenticarse contra el Worker queda visible en ese código fuente — no es un secreto perfecto, cualquiera que revise el repo podría encontrarlo y, en teoría, mandar datos falsos al Worker. Se acepta este riesgo explícitamente porque:

- La app es de un solo usuario (Sebas), sin datos sensibles de terceros.
- No hay incentivo real para que alguien ataque específicamente este Worker.

Si en el futuro esto cambia (por ejemplo, otros usuarios reales), este punto habría que resolverlo con autenticación real en vez de un token fijo.

## Testing

- El Worker se prueba de forma aislada (mandarle gastos de prueba con `curl` o similar) antes de conectarlo a la app real.
- La lógica de cola pendiente / reintento en la app se cubre con pruebas automáticas en el mismo patrón que ya existe (`logic.test.js`), simulando que el envío al Worker falla y verificando que el gasto queda encolado y se reintenta correctamente.

## Fuera de alcance (explícitamente, para esta ronda)

- Edición desde Sheets hacia la app (sync de un solo sentido, ya decidido arriba).
- Multi-usuario o cualquier forma de compartir la hoja con otra persona.
- Gráficas o dashboards dentro de Sheets — Sebas puede armarlas él mismo con las columnas ya expuestas, no es parte de este trabajo.
