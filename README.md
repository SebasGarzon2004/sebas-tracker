# Sebas' Tracker

Una libreta de gastos personal, pensada como un cuaderno de recibos: cada gasto es su propia hoja, se pasa página deslizando el dedo, y el mes se resume aparte con un desglose por categoría y por forma de pago.

Sin cuentas, sin servidor, sin conexión obligatoria. Todo vive en el navegador — tus datos nunca salen de tu teléfono.

## Qué trae

- Registro rápido: monto, categoría, forma de pago y una nota opcional, con vista previa tipo recibo mientras escribes.
- Resumen del mes con el total y el desglose por categoría y por forma de pago, cada uno con su propio color.
- Comparación automática contra el mes anterior (solo cuando ese mes ya terminó).
- Filtro del cuaderno por categoría o por forma de pago, tocando cualquier fila del resumen.
- Navegación entre meses con flechas y con gestos.
- Se puede instalar en la pantalla de inicio del teléfono y funciona sin internet una vez instalada.

## Usarla

Entra a **[sebasgarzon2004.github.io/sebas-tracker](https://sebasgarzon2004.github.io/sebas-tracker)** desde el navegador de tu teléfono y, si quieres, agrégala a tu pantalla de inicio (en iPhone: botón de compartir → "Añadir a pantalla de inicio").

## Hacerla tuya

Las categorías, formas de pago y colores están pensados para mis propios gastos, pero está armada para que cualquiera la ajuste a los suyos sin mucho esfuerzo:

- **Categorías y formas de pago**: se definen en un solo lugar, al principio de `logic.js` (`CATEGORIAS` y `PAGOS`).
- **Colores**: son variables CSS al principio de `index.html` (dentro de `:root`), una por categoría y una por forma de pago.
- **Sin build, sin dependencias**: es HTML, CSS y JS simples. Clonas el repo, editas lo que quieras, y ya.

Para probar cambios en tu propia compu antes de subirlos:

```bash
python3 -m http.server 8010
```

y abrir `http://localhost:8010` en el navegador.

## Cómo está hecho

Toda la lógica que se puede probar sin navegador (fechas, cálculos de resumen, navegación entre páginas) vive en `logic.js`, con sus propias pruebas en `logic.test.js` (`node --test logic.test.js`). El resto — la interfaz, el gesto de pasar página, las animaciones — vive en `index.html`.
