# PROYECTO: BUS-IN-LIVE

## 1. INSTRUCCIÓN GENERAL

Quiero desarrollar una aplicación web responsive llamada provisionalmente **“bus-in-live”**, orientada inicialmente a **Santa Ana, El Salvador**, pero cuya arquitectura debe quedar preparada para ampliarse posteriormente a todo El Salvador.

La aplicación debe servir para que usuarios del transporte público puedan conocer, de forma sencilla y visual:

* dónde se encuentran aproximadamente los buses de una ruta;
* cuánto tiempo aproximadamente falta para que un bus llegue a una parada;
* qué rutas pasan cerca del usuario;
* si una ruta está funcionando normalmente;
* si existe retraso;
* si existe una desviación;
* si existe una desviación temporal;
* si el servicio fue suspendido;
* qué buses o variantes de una ruta existen;
* qué velocidad aproximada lleva el transporte;
* cuánto suelen tardar determinados segmentos de una ruta;
* cuánto tiempo suele existir entre la salida de buses de una terminal;
* y reportar información incorrecta, problemas, accidentes, buses averiados, desviaciones u otros inconvenientes.

El proyecto debe ser **real y funcional**, no una simple maqueta.

No inventes datos reales de rutas, buses, horarios, velocidades, nombres de empresas, paradas o incidencias.

La plataforma debe poder comenzar sin una base de datos completa de rutas, porque **la comunidad será una de las fuentes principales de información**.

Cuando todavía no exista información suficiente, la aplicación debe mostrar estados como:

* “No hay suficientes datos”
* “Sin información reciente”
* “ETA no disponible”
* “Ruta aún no validada”
* “Necesitamos más observaciones”
* “Información con baja confianza”

Nunca mostrar valores inventados para aparentar que el sistema funciona.

---

# 2. FORMA DE TRABAJO DE LA IA

Antes de construir funcionalidades importantes:

1. Analiza el proyecto completo.
2. Identifica contradicciones o decisiones técnicas que realmente bloqueen la implementación.
3. Pregunta únicamente las cosas que sean necesarias para continuar.
4. No preguntes nuevamente información que ya aparece en este prompt.
5. No conviertas preguntas secundarias en bloqueos.
6. Si existe una decisión técnica razonable que no haya sido especificada, tómala y documenta la decisión.
7. No inventes requisitos.
8. No agregues funcionalidades por capricho.
9. No cambies el objetivo principal de la aplicación.
10. Mantén el proyecto simple cuando una solución simple sea suficiente.
11. No construyas una arquitectura excesivamente compleja únicamente porque sea técnicamente posible.
12. Si una funcionalidad resulta demasiado grande para la primera versión, implementa una beta funcional bien estructurada y deja preparada la arquitectura para ampliarla después.
13. No destruyas funcionalidades existentes al agregar nuevas.
14. Antes de modificar partes importantes del sistema, revisa cómo están implementadas.
15. Cuando existan varias alternativas técnicas, explica brevemente cuál elegiste y por qué.

La aplicación debe priorizar:

**funcionamiento real > confiabilidad > privacidad > claridad > estética > complejidad técnica.**

---

# 3. OBJETIVO PRINCIPAL

El problema que queremos resolver es la incertidumbre de los usuarios respecto al transporte público.

Actualmente un usuario puede:

* llegar a una parada y no saber cuánto tardará el siguiente bus;
* llegar tarde porque el bus acababa de pasar;
* esperar más de lo habitual debido al tráfico;
* desconocer que existe un accidente;
* desconocer que un bus cambió temporalmente su recorrido;
* no saber si una ruta está suspendida;
* desconocer que determinados buses recorren la misma ruta de forma directa o no directa;
* no saber qué parada le queda más cerca;
* no disponer de información actualizada sobre el transporte.

Bus-in-Live debe intentar reducir esa incertidumbre utilizando información proporcionada por los usuarios y datos derivados de sus observaciones GPS.

---

# 4. CONCEPTO FUNDAMENTAL DEL SISTEMA

NO se debe asumir que existe un GPS instalado físicamente en cada bus.

El sistema funcionará principalmente mediante **información colaborativa**.

Un usuario puede permitir que la aplicación utilice su ubicación durante su viaje.

Ejemplo:

Un usuario selecciona:

> “Estoy viajando en esta ruta.”

La aplicación obtiene periódicamente su posición GPS.

Si esa posición coincide con el trayecto de una determinada ruta, se puede utilizar como una **observación de transporte**.

Cuando varias observaciones recientes coinciden con una ruta, el sistema puede inferir:

* posición aproximada;
* dirección;
* velocidad aproximada;
* segmento del recorrido;
* progreso del viaje;
* tiempo aproximado hasta determinadas paradas.

IMPORTANTE:

La aplicación no debe afirmar:

> “El bus está exactamente aquí.”

cuando en realidad solamente existe una inferencia.

Debe utilizar lenguaje como:

> “Ubicación aproximada”

> “Estimación basada en usuarios”

> “Última observación hace 2 min”

> “Confianza alta/media/baja”

---

# 5. PRINCIPIO CRÍTICO PARA EL GPS

No cualquier GPS de cualquier usuario debe considerarse automáticamente como ubicación de un bus.

Por ejemplo:

Una persona caminando cerca de una ruta NO significa que exista un bus allí.

Por eso debe existir un mecanismo para diferenciar:

### Usuario esperando

Utiliza su ubicación para:

* encontrar paradas cercanas;
* consultar rutas;
* obtener recomendaciones.

Su GPS NO debe utilizarse automáticamente como ubicación de un bus.

### Usuario viajando

Puede activar:

> “Estoy viajando en una ruta”

y seleccionar una ruta.

Opcionalmente puede seleccionar una variante.

Solo entonces las observaciones GPS pueden utilizarse como evidencia del recorrido del transporte.

La aplicación debe explicar claramente qué está compartiendo y durante cuánto tiempo.

---

# 6. USUARIOS

El sistema debe utilizar inicialmente dos roles principales:

## Usuario

El usuario normal puede:

* registrarse;
* iniciar sesión;
* utilizar Google;
* consultar rutas;
* consultar buses;
* consultar mapas;
* encontrar paradas cercanas;
* utilizar GPS;
* compartir ubicación durante un viaje;
* agregar rutas;
* editar información;
* sugerir cambios;
* reportar problemas;
* reportar desviaciones;
* reportar suspensión;
* reportar buses averiados;
* marcar rutas o paradas favoritas;
* consultar historial;
* recibir notificaciones;
* consultar ETA;
* indicar si está viajando en una determinada ruta.

El usuario NO puede convertirse a administrador desde la interfaz.

## Administrador

El rol administrador debe ser asignado internamente y no debe poder escogerse desde el registro normal.

El administrador puede:

* gestionar rutas;
* aprobar/rechazar modificaciones;
* administrar reportes;
* eliminar rutas cuando exista una solicitud válida;
* moderar información;
* administrar incidentes;
* corregir datos;
* revisar actividad;
* visualizar estadísticas;
* administrar estados;
* gestionar usuarios si es necesario;
* revisar observaciones GPS;
* invalidar observaciones sospechosas.

---

# 7. AUTENTICACIÓN

Implementar:

* correo + contraseña;
* inicio de sesión con Google;
* cierre de sesión;
* recuperación de contraseña;
* manejo de sesión;
* protección de páginas privadas.

Por defecto todo registro nuevo será:

`role = user`

El rol de administrador debe estar protegido mediante backend/base de datos.

Nunca confiar en que esconder una opción en el frontend constituye seguridad.

---

# 8. UBICACIÓN DEL USUARIO

Usar la API de geolocalización del navegador cuando sea apropiado.

La aplicación debe solicitar permiso de ubicación de forma explícita.

La aplicación debe indicar:

* para qué se utilizará;
* si se está utilizando actualmente;
* durante cuánto tiempo;
* cómo detenerlo;
* si la información se almacenará;
* qué parte puede convertirse en información agregada.

Debe existir un botón claramente visible para:

> “Dejar de compartir ubicación”.

---

# 9. PRIVACIDAD

La ubicación es información sensible.

Diseñar el sistema bajo el principio de minimización de datos.

Preferir:

* datos temporales;
* datos agregados;
* datos anonimizados/pseudonimizados;
* eliminación automática cuando ya no sean necesarios.

Evitar almacenar permanentemente una trayectoria personal completa cuando solo se necesita calcular el comportamiento de una ruta.

El sistema debe permitir configurar:

* compartir ubicación ahora;
* compartir durante este viaje;
* compartir durante determinado intervalo horario;
* detener completamente el seguimiento.

IMPORTANTE:

Una web no debe fingir que puede ejecutar seguimiento GPS permanente y confiable cuando el navegador está cerrado.

Si la plataforma no puede realizar seguimiento en segundo plano de forma confiable, implementar una alternativa honesta:

* programación de periodos;
* recordatorio para activar el seguimiento;
* seguimiento mientras la aplicación está activa;
* o PWA cuando tenga sentido.

No prometer seguimiento en segundo plano que el navegador no pueda garantizar.

---

# 10. DATOS DE TRANSPORTE

La plataforma debe trabajar con datos como:

* ubicación inicial;
* ubicación posterior;
* tiempo entre posiciones;
* precisión GPS;
* velocidad;
* ruta;
* variante;
* dirección;
* parada;
* coordenadas;
* horarios;
* estado;
* incidentes;
* desviaciones;
* observaciones;
* reportes;
* tiempo estimado;
* frecuencia estimada.

---

# 11. ESTRUCTURA CONCEPTUAL DE RUTAS

No considerar una “ruta” como simplemente una línea.

Una ruta puede tener diferentes variantes.

Ejemplo:

Ruta X

* Variante directa
* Variante no directa

Ambas pertenecen a la misma ruta, pero recorren trayectos diferentes.

---

# 12. DIRECTO / NO DIRECTO

### Directo

Un bus con un trayecto más corto dentro de la ruta normal para llegar al destino final.

### No directo

Un bus que realiza una trayectoria más larga dentro de la ruta normal.

Una misma ruta puede tener buses:

* directos;
* no directos.

Por defecto, un bus añadido por un usuario debe clasificarse como:

`no_directo`

El usuario podrá modificar esa clasificación.

No confundir esto con una desviación provocada por tráfico, accidente u otro incidente.

---

# 13. TIPOS DE DESVIACIÓN

Separar claramente tres conceptos.

## A. Ruta normal

La trayectoria que forma parte del funcionamiento habitual.

## B. Desviación temporal

La ruta normal fue modificada durante un periodo limitado.

Ejemplos:

* calle cerrada;
* evento;
* trabajos;
* accidente;
* tráfico extremo;
* bloqueo temporal.

Debe tener:

* motivo;
* fecha/hora de inicio;
* posible fecha/hora de finalización;
* ruta afectada;
* trayectoria alternativa;
* estado.

## C. Desviación/incidencia en tiempo real

Un bus está cambiando temporalmente su camino por una situación puntual.

No necesariamente implica que la ruta completa haya cambiado.

El sistema debe distinguir claramente:

`variante normal`

de

`desviación temporal`

de

`incidencia puntual`.

---

# 14. TIPOS DE TRANSPORTE

Debe existir inicialmente:

### Regular

Transporte normal.

### Especial

Transporte más caro que el regular y que puede contar con características especiales, por ejemplo aire acondicionado.

No inventar características adicionales que no hayan sido especificadas.

---

# 15. ESTADOS DE RUTA

Implementar como mínimo:

### Normal

Servicio funcionando aparentemente con normalidad.

### Retraso

El comportamiento observado está por encima del tiempo habitual.

### Desvío

Existe una modificación del recorrido.

### Desvío temporal

Existe una modificación durante un periodo limitado.

### Suspendido

No existe servicio disponible actualmente.

### Fuera de servicio

Se detecta un vehículo fuera de operación.

### Información insuficiente

No existen suficientes datos recientes para determinar el estado.

Utilizar una etiqueta visual y textual, no únicamente color.

---

# 16. ESTADOS DE CONFIANZA

Toda información derivada de usuarios debe poder tener un nivel de confianza.

Por ejemplo:

* Alta
* Media
* Baja
* Insuficiente

El nivel dependerá de factores como:

* cantidad de observaciones;
* antigüedad;
* precisión GPS;
* consistencia;
* coincidencia con la ruta;
* cantidad de usuarios;
* reportes coincidentes;
* velocidad detectada;
* dirección detectada.

Nunca mostrar una precisión falsa.

---

# 17. ESTIMACIÓN DE UBICACIÓN DEL BUS

Crear un sistema de estimación.

Entrada:

* ubicación GPS;
* hora;
* ruta seleccionada;
* variante;
* secuencia de puntos;
* velocidad;
* precisión;
* dirección;
* observaciones recientes.

Proceso:

1. Obtener las posiciones GPS.
2. Comprobar si la posición coincide con la ruta.
3. Realizar map matching o equivalente.
4. Determinar el segmento de ruta más probable.
5. Determinar dirección.
6. Determinar progreso.
7. Calcular velocidad aproximada.
8. Comparar con otras observaciones recientes.
9. Asignar nivel de confianza.
10. Estimar llegada a las siguientes paradas.

Cuando haya múltiples usuarios viajando por la misma ruta, combinar las observaciones.

No utilizar simplemente:

`promedio simple de todos los GPS`

porque un usuario detenido, desviado o con señal errónea puede deformar el resultado.

Utilizar métodos robustos cuando sea posible.

---

# 18. CÁLCULO DE VELOCIDAD

Si:

* posición A = coordenada;
* posición B = coordenada;
* tiempo A;
* tiempo B;

calcular aproximadamente:

`velocidad = distancia / tiempo`

La distancia debe calcularse geográficamente.

Considerar:

* precisión GPS;
* saltos imposibles;
* pérdida de señal;
* velocidades irreales;
* posiciones repetidas;
* usuarios que abandonan la ruta.

Descartar observaciones evidentemente erróneas.

No permitir que un error de GPS indique velocidades imposibles.

---

# 19. VELOCIDAD POR SEGMENTOS

La velocidad no será necesariamente igual durante toda una ruta.

Por eso la aplicación debe intentar identificar:

* segmentos rápidos;
* segmentos lentos;
* segmentos congestionados;
* zonas donde normalmente el bus se detiene;
* tiempos medios por segmento.

Ejemplo conceptual:

Segmento A:
promedio 24 km/h

Segmento B:
promedio 7 km/h

Segmento C:
promedio 15 km/h

No presentar estos números hasta existir suficientes observaciones.

---

# 20. ETA

La aplicación debe calcular:

> “Bus llega aproximadamente en 7 min”

para la parada seleccionada.

El ETA debe considerar:

* ubicación actual estimada;
* progreso de ruta;
* segmento actual;
* velocidades recientes;
* velocidades históricas;
* tiempos de espera;
* congestión;
* desviaciones;
* incidentes;
* dirección;
* comportamiento histórico.

El sistema debe combinar información actual e histórica cuando sea posible.

No usar únicamente:

`distancia / velocidad actual`

porque eso puede ser muy impreciso.

Si existe información histórica suficiente:

`ETA = comportamiento histórico del segmento + observación actual + condiciones recientes`

con pesos configurables.

---

# 21. ADVERTENCIA DE ETA

Mostrar una advertencia sencilla:

> “El tiempo es aproximado. El bus puede llegar antes o después. Se recomienda llegar a la parada unos 5 minutos antes.”

Esta advertencia debe aparecer claramente, especialmente cuando la confianza sea baja o media.

---

# 22. FRECUENCIA DE LOS BUSES

El sistema debe intentar calcular el tiempo promedio entre buses.

Ejemplo:

> “Tiempo promedio entre buses: 12 min”

Esto NO debe ser inventado.

Debe calcularse a partir de observaciones reales.

Cuando existan terminales identificadas:

* detectar paso/salida de buses;
* calcular separación entre observaciones;
* obtener promedio/mediana;
* mostrar cantidad de observaciones;
* indicar cuándo fue actualizada.

Ejemplo:

> Frecuencia estimada: cada 11–14 min
> Basado en 27 observaciones recientes.

Si existen pocas observaciones:

> “Aún no hay suficientes datos para calcular la frecuencia.”

---

# 23. TERMINALES

Una parada puede tener atributos como:

* normal;
* terminal;
* inicio;
* final;
* intermedia.

El usuario o administrador puede identificar terminales.

No asumir automáticamente que cualquier primera/última parada es una terminal real.

---

# 24. PARADAS

Cada parada debe poder tener:

* nombre;
* coordenadas;
* ruta;
* secuencia;
* dirección;
* tipo;
* estado;
* descripción;
* accesibilidad si posteriormente se desea;
* timestamp de actualización.

---

# 25. DETECCIÓN DE PARADAS CERCANAS

La aplicación debe tener una función:

> “Paradas cercanas”

Cuando el usuario la activa:

1. solicitar ubicación si no existe permiso;
2. obtener posición;
3. calcular distancia a paradas;
4. mostrar las más cercanas;
5. permitir seleccionar una;
6. mostrar rutas disponibles en esa parada.

Ejemplo:

> Estás a 140 m de Parada X

> Ruta 10 — 6 min

> Ruta 22 — 13 min

La proximidad debe utilizar GPS.

No implementar un supuesto “sensor físico” de proximidad que no sea necesario.

---

# 26. RANGO DE PROXIMIDAD

El radio inicial puede ser configurable.

Ejemplo:

* 100 m;
* 250 m;
* 500 m.

Permitir ajustar este valor posteriormente.

La aplicación debe considerar precisión GPS para evitar falsas coincidencias.

---

# 27. MAPA PRINCIPAL

El mapa debe ser uno de los elementos centrales de la aplicación.

Debe poder mostrar:

* posición del usuario;
* rutas;
* trayectos;
* paradas;
* buses estimados;
* incidencias;
* desviaciones;
* zonas de interés;
* terminales.

Permitir activar/desactivar capas.

---

# 28. MAPA

Para el prototipo utilizar preferentemente una solución basada en:

**Leaflet + OpenStreetMap**

siempre que las condiciones de uso sean adecuadas.

La arquitectura debe permitir cambiar el proveedor de mapas en el futuro.

No acoplar todo el sistema a un único proveedor.

No depender obligatoriamente de servicios pagos.

---

# 29. ICONOS EN EL MAPA

Usar iconos visuales para diferenciar:

* usuario;
* bus;
* parada;
* terminal;
* accidente;
* desviación;
* cierre;
* suspensión.

Los iconos deben ser claros y accesibles.

No depender únicamente del color.

---

# 30. INFORMACIÓN DEL BUS

Cuando se seleccione una observación de bus, mostrar:

* ruta;
* variante;
* tipo;
* ubicación aproximada;
* dirección;
* velocidad aproximada;
* última actualización;
* tiempo hasta próxima parada;
* ETA;
* nivel de confianza;
* fuente.

Ejemplo:

> Ruta 10
> No directo
> Ubicación aproximada
> Última observación: hace 1 min
> Velocidad estimada: 18 km/h
> Próxima parada: 4 min
> Confianza: media

---

# 31. FUENTE DE INFORMACIÓN

Mostrar de dónde procede la información.

Ejemplos:

* Observación GPS de usuarios
* Reporte comunitario
* Horario registrado
* Dato administrativo
* Cálculo histórico

Esto aumenta transparencia.

---

# 32. HOME

La pantalla Home debe funcionar como dashboard.

Debe incluir:

* nombre del proyecto;
* resumen de su propósito;
* acceso rápido al mapa;
* buscar ruta;
* paradas cercanas;
* favoritos;
* reportar problema;
* iniciar seguimiento de viaje;
* información del proyecto;
* misión;
* visión;
* términos y condiciones;
* privacidad;
* inicio de sesión/registro.

No inventar la misión y visión si no han sido proporcionadas.

Crear espacios editables o preguntar al desarrollador por el contenido.

---

# 33. MAPA / EXPLORADOR

Pantalla principal de consulta.

Debe permitir:

* buscar ruta;
* filtrar ruta;
* seleccionar bus;
* seleccionar parada;
* ver posición del usuario;
* ver buses estimados;
* ver ETA;
* ver incidencias;
* ver desviaciones;
* ver estado.

Debe poder funcionar tanto en escritorio como en móvil.

---

# 34. BÚSQUEDA DE RUTAS

Permitir buscar por:

* número;
* nombre;
* origen;
* destino;
* palabras relacionadas;
* ruta favorita.

Mostrar coincidencias claramente.

---

# 35. FILTROS

Crear filtros para:

* hora;
* ruta;
* cercanía;
* parada;
* tipo;
* regular;
* especial;
* directo;
* no directo;
* estado;
* desviación;
* normal;
* suspendido.

No sobrecargar la interfaz móvil.

En celular utilizar panel de filtros.

---

# 36. RUTAS FAVORITAS

El usuario podrá guardar:

* rutas;
* paradas;
* combinaciones de consulta.

En Home mostrar favoritos.

---

# 37. HISTORIAL

Registrar opcionalmente:

* rutas consultadas;
* paradas consultadas;
* búsquedas recientes;
* rutas utilizadas;
* reportes realizados.

Respetar configuración de privacidad.

---

# 38. REPORTES COMUNITARIOS

Esta debe ser una funcionalidad importante.

El usuario debe poder reportar:

* accidente;
* tráfico;
* bus averiado;
* bus no pasó;
* ruta suspendida;
* desviación;
* información incorrecta;
* parada incorrecta;
* ruta incorrecta;
* ETA incorrecto;
* otro problema.

---

# 39. REPORTE DE DESVIACIÓN

Permitir:

* seleccionar ruta;
* indicar tipo;
* seleccionar ubicación;
* describir motivo;
* seleccionar duración estimada;
* agregar trayectoria alternativa mediante mapa;
* enviar.

Ejemplo:

> “Ruta desviada por accidente”

---

# 40. VALIDACIÓN DE REPORTES

No asumir automáticamente que cualquier reporte es verdadero.

Los reportes deben tener:

* estado;
* timestamp;
* autor;
* ubicación;
* evidencia cuando exista;
* coincidencia con otros reportes.

Estados:

* pendiente;
* confirmado;
* rechazado;
* expirado;
* resuelto.

Los administradores pueden moderarlos.

---

# 41. REPORTES TEMPORALES

Los incidentes que duren cierto tiempo deben poder expirar automáticamente.

Ejemplo:

Accidente reportado a las 4:00 PM.

A las 8:00 PM:

* puede continuar;
* puede resolverse;
* o puede requerir confirmación.

No dejar incidentes temporales activos indefinidamente.

---

# 42. AGREGAR RUTAS

Los usuarios pueden agregar rutas que conozcan.

Formulario mínimo:

* número/nombre;
* origen;
* destino;
* tipo;
* variante;
* paradas;
* trayecto;
* información adicional.

El usuario podrá dibujar el recorrido sobre el mapa.

---

# 43. EDITAR RUTAS

Los usuarios pueden proponer modificaciones.

Separar:

### Modificación de ruta fija

Cambios en el recorrido habitual.

### Modificación temporal

Cambio válido únicamente durante determinado tiempo.

La modificación debe conservar historial.

No sobrescribir destructivamente el recorrido anterior.

---

# 44. ELIMINACIÓN DE RUTAS

Un usuario normal NO elimina directamente una ruta.

Debe existir:

> “Solicitar eliminación de ruta”

El usuario debe indicar:

* ruta;
* motivo;
* explicación;
* evidencia opcional.

El administrador decide:

* aprobar;
* rechazar;
* solicitar más información.

Si se elimina, preferiblemente realizar una **eliminación lógica/soft delete**, no borrar físicamente los registros históricos.

---

# 45. CONTROL DE VERSIONES

Las rutas deben permitir conservar:

* versión anterior;
* versión nueva;
* usuario que propuso cambio;
* fecha;
* razón;
* estado.

Esto es especialmente importante porque la información es comunitaria.

---

# 46. SISTEMA DE BUSES

No asumir que cada usuario conoce el identificador real de un bus.

Debe ser posible trabajar inicialmente con:

**observaciones de vehículos**

en lugar de exigir un registro permanente de cada bus.

Posteriormente, si existen suficientes datos, podría añadirse:

* identificador del bus;
* placa;
* número interno;
* alias.

Pero estos datos no deben ser obligatorios.

---

# 47. INICIO DE VIAJE

Crear una función:

> “Estoy viajando”

Flujo:

1. Usuario pulsa “Estoy viajando”.
2. Selecciona ruta.
3. Selecciona variante si corresponde.
4. Acepta compartir ubicación.
5. Comienza la captura.
6. La aplicación indica que está compartiendo.
7. El usuario puede detenerla.

Mientras viaja:

* mostrar mapa;
* ruta;
* progreso;
* velocidad aproximada;
* próxima parada;
* ETA;
* estado.

---

# 48. FINALIZAR VIAJE

Permitir:

> “Finalizar viaje”

Después:

* detener GPS;
* enviar datos necesarios;
* limpiar datos temporales;
* mantener únicamente información agregada si corresponde.

---

# 49. CALIDAD DE GPS

Considerar:

* accuracy;
* timestamp;
* velocidad;
* rumbo;
* posición;
* intervalos;
* pérdida de señal.

No confiar ciegamente en una coordenada con baja precisión.

Ejemplo:

Si accuracy > determinado umbral configurable:

> “Señal GPS imprecisa”

y reducir el peso de esa observación.

---

# 50. OBSERVACIONES IMPOSIBLES

Detectar:

* saltos de kilómetros en segundos;
* velocidades absurdas;
* cambios imposibles de dirección;
* posiciones fuera del corredor de ruta;
* duplicados;
* timestamps incorrectos.

No incorporar automáticamente estos datos al cálculo.

---

# 51. DATOS HISTÓRICOS

Separar:

### Datos en tiempo real

Información reciente.

### Datos históricos

Promedios calculados de periodos anteriores.

La interfaz debe dejar claro cuando se está mostrando una estimación histórica.

---

# 52. CÁLCULO DE PROMEDIOS

Evitar usar únicamente promedios simples cuando los datos tengan valores extremos.

Cuando tenga sentido utilizar:

* mediana;
* promedio ponderado;
* percentiles;
* ventanas temporales;
* datos recientes con mayor peso.

Documentar la lógica utilizada.

---

# 53. SISTEMA DE DATOS INSUFICIENTES

El sistema debe saber decir:

> “No tengo suficiente información.”

Por ejemplo:

Para una ruta con solo 2 observaciones:

No mostrar:

> “Frecuencia: cada 10 minutos”

Debe mostrar:

> “Aún no hay suficientes observaciones para calcular la frecuencia.”

---

# 54. NOTIFICACIONES

Permitir notificaciones para:

* cambios de ruta;
* desviaciones;
* suspensión;
* incidentes;
* llegada aproximada;
* ruta favorita afectada.

No enviar demasiadas notificaciones.

El usuario debe poder activar/desactivar categorías.

---

# 55. NOTIFICACIONES DEL NAVEGADOR

Implementar cuando sea compatible.

No asumir que todos los navegadores móviles permiten exactamente el mismo comportamiento.

Si una plataforma no lo permite, ofrecer alternativa dentro de la aplicación.

---

# 56. PANEL DE ADMINISTRADOR

Debe incluir:

### Dashboard

* rutas activas;
* rutas pendientes;
* reportes;
* incidentes;
* observaciones recientes;
* solicitudes de eliminación;
* usuarios activos;
* problemas de calidad de datos.

### Rutas

* crear;
* editar;
* revisar;
* aprobar cambios;
* gestionar variantes;
* gestionar paradas.

### Reportes

* revisar;
* confirmar;
* rechazar;
* resolver.

### Desviaciones

* activar;
* editar;
* cerrar;
* expirar.

### Usuarios

* visualizar;
* administrar permisos si corresponde.

---

# 57. SEGURIDAD DEL ADMIN

No confiar exclusivamente en:

* botones ocultos;
* variables del frontend;
* localStorage.

La autorización debe existir realmente en backend/database.

Usar reglas de acceso.

---

# 58. BASE DE DATOS

Preferir inicialmente una arquitectura con:

**PostgreSQL + Supabase**

por su combinación de:

* PostgreSQL;
* autenticación;
* Google OAuth;
* Row Level Security;
* Realtime;
* API;
* almacenamiento.

Pero no acoplar toda la lógica del proyecto a Supabase.

Crear una capa de servicios/repository que facilite una migración futura.

Si posteriormente se desea Firebase u otro backend, la lógica principal de negocio no debería tener que reescribirse completa.

---

# 59. MODELO DE DATOS PROPUESTO

La estructura puede partir de las siguientes entidades:

### profiles

* id
* email
* nombre
* avatar
* role
* created_at
* updated_at

### routes

* id
* code
* name
* origin
* destination
* type
* status
* created_by
* validation_status
* created_at
* updated_at
* deleted_at

### route_variants

* id
* route_id
* name
* variant_type
* direct
* description
* active
* created_at

### stops

* id
* name
* latitude
* longitude
* stop_type
* created_by
* status
* created_at

### route_stops

* id
* route_id
* variant_id
* stop_id
* sequence
* direction

### route_shapes

* id
* route_id
* variant_id
* geometry
* version
* active

### buses / vehicle_profiles

Opcional, solo si posteriormente se puede identificar el vehículo.

### trip_sessions

* id
* user_id
* route_id
* variant_id
* started_at
* ended_at
* consent
* status

### location_points

* id
* trip_session_id
* latitude
* longitude
* accuracy
* speed
* heading
* timestamp

### bus_observations

Datos derivados de las ubicaciones.

* id
* route_id
* variant_id
* trip_session_id
* latitude
* longitude
* route_progress
* speed
* confidence
* observed_at
* source

### incidents

* id
* route_id
* variant_id
* type
* location
* description
* status
* severity
* starts_at
* expires_at
* created_by

### detours

* id
* route_id
* original_shape
* temporary_shape
* reason
* starts_at
* ends_at
* status
* created_by

### reports

* id
* user_id
* route_id
* type
* location
* description
* evidence
* status
* reviewed_by
* reviewed_at
* created_at

### route_change_requests

* id
* route_id
* user_id
* type
* old_data
* proposed_data
* reason
* status
* reviewed_by

### deletion_requests

* id
* route_id
* user_id
* reason
* evidence
* status
* reviewed_by

### favorites

* id
* user_id
* route_id
* stop_id

### search_history

* id
* user_id
* search_type
* reference_id
* created_at

### notification_preferences

* id
* user_id
* category
* enabled

### user_consents

* id
* user_id
* gps_enabled
* gps_schedule
* data_retention_preference
* updated_at

---

# 60. ROW LEVEL SECURITY

Si se usa Supabase:

Implementar RLS correctamente.

El usuario debe poder:

* leer información pública;
* modificar sus propios perfiles permitidos;
* crear sus propios reportes;
* crear sus propias sesiones;
* acceder a sus propios datos;
* gestionar sus favoritos.

No debe poder:

* convertir su rol a admin;
* leer ubicaciones privadas de otros usuarios;
* alterar reportes ajenos;
* aprobar sus propios cambios;
* eliminar rutas directamente.

---

# 61. PRIVACIDAD DE UBICACIONES

No mostrar públicamente:

* la identidad del usuario;
* el correo;
* el nombre asociado a una observación;
* una trayectoria personal completa.

Para los datos colaborativos, mostrar:

> “Observación comunitaria”

en lugar de identificar a la persona.

---

# 62. ARQUITECTURA FRONTEND

Utilizar preferentemente:

* HTML5;
* CSS3;
* JavaScript moderno;
* ES Modules;
* API web estándar;
* Vite si es útil.

No utilizar frameworks innecesarios.

Si Google AI Studio genera React por defecto y la plataforma lo requiere o facilita sustancialmente el desarrollo, puede utilizarse React, pero la arquitectura debe continuar siendo sencilla y comprensible.

No introducir Next.js, Redux u otras herramientas pesadas sin una razón real.

---

# 63. RESPONSIVE

Debe funcionar correctamente en:

* teléfono;
* tablet;
* laptop;
* escritorio.

Diseñar mobile-first.

---

# 64. NAVEGACIÓN DESKTOP

Usar:

* barra superior;
* menú lateral;
* contenido central.

---

# 65. NAVEGACIÓN MOBILE

Usar:

* barra superior compacta;
* navegación inferior;
* paneles;
* tarjetas;
* filtros mediante bottom sheet o modal.

---

# 66. ESTILO VISUAL

Interfaz:

**formal, moderna, sencilla y clara.**

No utilizar un diseño excesivamente futurista.

No llenar la pantalla con elementos.

Debe sentirse como una aplicación de transporte real.

---

# 67. COLOR PRINCIPAL

Color solicitado:

`#FF0000`

Pero no utilizar únicamente rojo puro para absolutamente todo.

Crear una paleta derivada.

Ejemplo base:

* Primary: #FF0000
* Primary Dark: #B00000
* Primary Soft: #FFE5E5
* Background: #F7F7F7
* Surface: #FFFFFF
* Text: #171717
* Muted: #6B6B6B
* Border: #E5E5E5

Para estados usar colores diferenciados y accesibles.

No utilizar texto blanco pequeño sobre rojo puro si el contraste no cumple accesibilidad.

---

# 68. TIPOGRAFÍA

Utilizar una tipografía sans-serif moderna.

Preferencia:

* Inter;
* system-ui;
* Arial;
* sans-serif.

Si se utiliza una fuente externa, dejar fallback.

---

# 69. COMPONENTES VISUALES

Utilizar:

* tarjetas;
* botones grandes;
* iconos;
* chips;
* indicadores;
* mapas;
* listas;
* modales;
* paneles;
* menús;
* estados;
* loaders;
* skeletons cuando tenga sentido.

---

# 70. MODO OSCURO

Implementar modo claro y modo oscuro.

No limitarse a invertir colores.

Crear variables CSS.

Ejemplo:

```css
:root {
  --primary: #ff0000;
  --background: #f7f7f7;
  --surface: #ffffff;
  --text: #171717;
}

[data-theme="dark"] {
  ...
}
```

---

# 71. COMPONENTES REUTILIZABLES

Crear componentes reutilizables para:

* RouteCard
* BusCard
* StopCard
* StatusBadge
* ETAIndicator
* MapMarker
* FilterPanel
* ReportModal
* LoadingState
* EmptyState
* ConfidenceBadge
* NotificationItem
* RouteDetails
* LocationPermissionPanel

No duplicar lógica.

---

# 72. PANTALLAS MÍNIMAS

Crear como mínimo:

1. Home
2. Login
3. Registro
4. Recuperación de contraseña
5. Mapa
6. Buscar ruta
7. Detalle de ruta
8. Detalle de parada
9. Buses de una ruta
10. Estoy viajando
11. Paradas cercanas
12. Reportar problema
13. Reportar desviación
14. Crear ruta
15. Editar ruta
16. Favoritos
17. Historial
18. Perfil
19. Privacidad/GPS
20. Notificaciones
21. Administrador
22. Gestión de rutas
23. Gestión de reportes
24. Gestión de incidencias
25. Gestión de solicitudes de cambios

---

# 73. DETALLE DE RUTA

Debe mostrar:

* nombre;
* origen;
* destino;
* variantes;
* tipo;
* estado;
* mapa;
* paradas;
* buses observados;
* ETA;
* frecuencia;
* última actualización;
* incidentes;
* desviaciones;
* reportes relevantes.

---

# 74. DETALLE DE PARADA

Mostrar:

* nombre;
* ubicación;
* rutas;
* próximos buses estimados;
* ETA;
* estado;
* distancia del usuario;
* favoritos.

---

# 75. PANEL DE BUS

Mostrar:

* ruta;
* variante;
* tipo;
* directo/no directo;
* ubicación aproximada;
* dirección;
* velocidad;
* última actualización;
* ETA;
* confianza.

---

# 76. REPORTAR PROBLEMA DESDE EL MAPA

Permitir abrir reportes rápidamente.

El sistema puede capturar:

* ubicación aproximada;
* ruta seleccionada;
* hora;
* contexto.

Pero permitir al usuario modificar la ubicación si es necesario.

---

# 77. SISTEMA DE ALERTAS

Crear un centro de notificaciones.

Ejemplo:

> Ruta 10 presenta una desviación temporal.

> La ruta 15 ha sido reportada como suspendida.

> Tu ruta favorita tiene una incidencia.

---

# 78. HISTORIAL DE DATOS

Nunca presentar información vieja como actual.

Mostrar:

> Actualizado hace 2 min

> Última observación: hace 18 min

> Información histórica

---

# 79. UI DE “SIN DATOS”

Crear estados visualmente buenos para:

* sin rutas;
* sin buses;
* sin GPS;
* sin permisos;
* sin ETA;
* sin reportes;
* sin favoritos;
* sin historial;
* sin información suficiente.

---

# 80. PWA

Evaluar convertir la web en PWA.

Debe permitir:

* instalación en el teléfono;
* icono;
* pantalla de inicio;
* cache de recursos estáticos.

No cachear indiscriminadamente datos de transporte en tiempo real.

---

# 81. FUNCIONAMIENTO OFFLINE

No prometer transporte en tiempo real sin conexión.

Cuando el usuario pierda conexión mostrar:

> “Sin conexión. Los datos en tiempo real no están disponibles.”

Permitir continuar utilizando información local que sea segura y no se presente como actual.

---

# 82. ARQUITECTURA DE SERVICIOS

Separar:

* UI;
* lógica de negocio;
* geolocalización;
* cálculo geográfico;
* ETA;
* autenticación;
* persistencia;
* notificaciones;
* mapa;
* administración.

No colocar todo en un único archivo JavaScript.

---

# 83. MANEJO DEL MAPA

Crear una capa de abstracción:

```text
MapProvider
 ├── LeafletProvider
 └── FutureProvider
```

Esto permitirá migrar posteriormente.

---

# 84. MANEJO DEL BACKEND

Crear servicios como:

```text
authService
routeService
stopService
busObservationService
locationService
etaService
incidentService
reportService
notificationService
favoriteService
adminService
```

No mezclar consultas de base de datos directamente por toda la interfaz.

---

# 85. ETA SERVICE

Crear un servicio aislado.

Ejemplo conceptual:

```text
calculateETA({
  currentPosition,
  route,
  variant,
  selectedStop,
  realtimeObservations,
  historicalSegmentData,
  incidents
})
```

Debe devolver algo parecido a:

```json
{
  "etaMinutes": 7,
  "confidence": "medium",
  "lastUpdated": "...",
  "source": ["realtime", "historical"],
  "warning": "El bus puede llegar antes o después."
}
```

---

# 86. GEOLOCATION SERVICE

Debe encargarse de:

* permisos;
* watchPosition;
* precisión;
* intervalos;
* detección de errores;
* detener seguimiento;
* sesiones.

No permitir que cualquier componente manipule directamente el GPS.

---

# 87. RUTAS Y GEOJSON

Preferentemente usar una estructura compatible con GeoJSON para geometrías.

Esto facilita:

* mapas;
* cálculos;
* visualización;
* almacenamiento;
* futura migración.

---

# 88. EDICIÓN DE TRAYECTOS

Permitir dibujar/modificar una trayectoria en el mapa.

La edición no debe destruir automáticamente la versión anterior.

Guardar versiones.

---

# 89. REPORTES Y MODERACIÓN

Todo cambio importante realizado por la comunidad debe poder rastrearse.

Registrar:

* quién;
* cuándo;
* qué cambió;
* valor anterior;
* nuevo valor;
* razón;
* estado.

---

# 90. AUDITORÍA

Crear registros de auditoría para acciones administrativas importantes:

* borrar;
* aprobar;
* rechazar;
* suspender;
* restaurar;
* modificar rutas;
* modificar roles.

---

# 91. ERRORES

Todos los errores deben tener mensajes entendibles.

Evitar mostrar:

```text
TypeError: Cannot read properties of undefined
```

al usuario final.

En su lugar:

> “No pudimos obtener tu ubicación. Comprueba los permisos de ubicación e inténtalo nuevamente.”

---

# 92. LOADING

No congelar la interfaz.

Mostrar:

* loading;
* skeleton;
* progreso;
* estados vacíos.

---

# 93. ACCESIBILIDAD

Aplicar:

* labels;
* contraste adecuado;
* navegación por teclado;
* focus visible;
* aria-label cuando corresponda;
* tamaños táctiles adecuados;
* información no dependiente únicamente de color.

---

# 94. SEGURIDAD

Implementar:

* validación de entrada;
* sanitización;
* autenticación;
* autorización;
* RLS;
* rate limiting cuando sea viable;
* protección de endpoints;
* manejo seguro de secrets;
* `.env`;
* `.env.example`.

Nunca colocar:

* API keys privadas;
* secretos;
* credenciales administrativas

directamente en el frontend.

---

# 95. CONFIGURACIÓN

Crear:

`.env.example`

con variables como:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
MAP_PROVIDER=
```

Las variables reales no deben incluirse en el repositorio.

---

# 96. GOOGLE AUTH

Implementar Google OAuth si el backend elegido lo permite.

La sesión debe integrarse con el mismo sistema de usuarios.

No crear dos perfiles separados para:

* email;
* Google.

Si ambos pertenecen a la misma cuenta, deberían poder vincularse correctamente según las capacidades del proveedor.

---

# 97. DATOS DE PRUEBA

IMPORTANTE:

No utilizar datos ficticios presentados como reales.

Durante desarrollo pueden utilizarse fixtures exclusivamente técnicos para comprobar componentes, pero deben estar:

* claramente identificados;
* aislados;
* desactivados o separados del entorno de producción;
* nunca mostrados como información real de transporte.

La interfaz pública debe depender de datos reales agregados por el sistema.

---

# 98. DATOS DE SANTA ANA

La primera fase estará enfocada en:

**Santa Ana, El Salvador**

No asumir que todas las rutas existentes de Santa Ana deben estar precargadas.

La plataforma debe comenzar vacía o con los datos reales que posteriormente sean introducidos.

---

# 99. ESCALABILIDAD

Aunque inicialmente solo se utilice Santa Ana, no codificar:

```text
city = Santa Ana
```

en toda la lógica.

Crear una estructura de ciudades/áreas.

Ejemplo:

```text
regions
cities
routes
```

Así posteriormente se puede extender a:

* San Salvador;
* Sonsonate;
* San Miguel;
* etc.

---

# 100. CAMBIO DE CIUDAD

Preparar la aplicación para eventualmente permitir:

> Seleccionar ciudad/zona.

No es necesario desarrollar todas las ciudades ahora.

---

# 101. ESTADÍSTICAS

El administrador debería poder consultar posteriormente:

* rutas más consultadas;
* rutas con más reportes;
* incidentes;
* usuarios activos;
* observaciones GPS;
* cantidad de datos;
* precisión del ETA;
* rutas con información insuficiente.

---

# 102. MÉTRICAS DE CALIDAD

El sistema debe ser capaz de medir posteriormente:

* error promedio del ETA;
* frecuencia de reportes falsos;
* cantidad de observaciones;
* antigüedad de información;
* cobertura de rutas;
* cantidad de usuarios aportando datos.

No crear métricas falsas.

---

# 103. CONFIRMACIÓN DE DATOS

Cuando sea posible comparar:

* GPS;
* reportes;
* horarios;
* datos históricos;

dar prioridad a la información más confiable.

Diseñar un sistema de puntuación o confianza documentado.

---

# 104. HORARIOS

Los horarios deben poder ser:

* agregados por usuarios;
* editados;
* reportados;
* revisados;
* marcados como aproximados;
* marcados como oficiales si algún día existe una fuente confiable.

No llamar “oficial” a información comunitaria.

---

# 105. DIFERENCIACIÓN DE DATOS

Cada dato debe poder indicar:

* oficial;
* comunitario;
* observado;
* calculado;
* estimado.

Esto es muy importante para la transparencia.

---

# 106. DISEÑO DEL MAPA EN MÓVIL

El mapa debe aprovechar gran parte de la pantalla.

Los detalles pueden abrirse mediante:

* bottom sheets;
* tarjetas flotantes;
* paneles deslizables.

No abrir demasiadas ventanas independientes.

---

# 107. DISEÑO DEL MAPA EN PC

Utilizar:

* mapa principal;
* panel lateral de información;
* filtros;
* búsqueda;
* navegación.

---

# 108. HOME MOBILE

Priorizar:

1. Buscar ruta
2. Mapa
3. Paradas cercanas
4. Estoy viajando
5. Favoritos
6. Reportar problema

---

# 109. HOME DESKTOP

Puede utilizar dashboard con:

* mapa;
* rutas recientes;
* favoritos;
* alertas;
* accesos rápidos.

---

# 110. PERFIL

Mostrar:

* cuenta;
* correo;
* autenticación;
* preferencias;
* favoritos;
* privacidad;
* GPS;
* notificaciones;
* historial;
* cerrar sesión.

---

# 111. PRIVACIDAD DEL GPS

Crear una pantalla específica.

Mostrar claramente:

> GPS activado

> Compartiendo ubicación

> Seguimiento detenido

> Datos utilizados para mejorar estimaciones

y permitir cancelar.

---

# 112. SCHEDULE DE GPS

El usuario puede configurar un horario preferido.

Ejemplo:

Lunes:
7:00–8:00 AM

4:00–6:00 PM

Pero no asumir que esto permite seguimiento automático si el navegador no está activo.

El horario debe servir como:

* configuración;
* recordatorio;
* activación cuando la plataforma tenga permiso y capacidad técnica.

---

# 113. EXPERIENCIA DEL USUARIO

Un usuario que acaba de abrir la aplicación debería poder hacer algo útil rápidamente.

El flujo ideal:

```text
Abrir app
↓
Compartir ubicación
↓
Ver paradas cercanas
↓
Seleccionar parada
↓
Ver rutas
↓
Seleccionar ruta
↓
Ver buses
↓
Ver ETA
```

Otro flujo:

```text
Abrir app
↓
Buscar ruta
↓
Seleccionar ruta
↓
Ver recorrido
↓
Ver buses
↓
Seleccionar parada
↓
Ver ETA
```

Otro:

```text
Abrir app
↓
Estoy viajando
↓
Seleccionar ruta
↓
Activar GPS
↓
Compartir observación
↓
Ver progreso
```

---

# 114. REPORTAR COMO FUNCIÓN CENTRAL

No esconder el botón de reportar.

Debe ser fácilmente accesible desde:

* mapa;
* ruta;
* bus;
* parada.

---

# 115. EJEMPLO DE REPORTES

El sistema debe poder manejar:

> “La ruta está desviada.”

> “El bus está averiado.”

> “El bus no pasó.”

> “Hay un accidente.”

> “El tráfico está detenido.”

> “Esta parada ya no existe.”

> “La ruta mostrada está equivocada.”

---

# 116. CADUCIDAD

Los datos temporales deben tener expiración.

No dejar un reporte de accidente activo durante días sin confirmación.

---

# 117. CONFLICTOS DE INFORMACIÓN

Si existen dos reportes diferentes:

No esconder silenciosamente la contradicción.

El sistema debe poder:

* mostrar incertidumbre;
* solicitar más confirmación;
* priorizar información reciente;
* derivar a administrador cuando sea necesario.

---

# 118. NO HALLUCINAR

Regla absoluta:

**No inventes datos para llenar la interfaz.**

Nunca inventes:

* buses;
* rutas;
* coordenadas;
* horarios;
* ETA;
* nombres de paradas;
* accidentes;
* velocidades.

Cuando falte información:

mostrar un estado de ausencia de datos.

---

# 119. NO SIMULAR FUNCIONES IMPORTANTES

No crear un botón:

> “Activar GPS”

que realmente no haga nada.

No crear:

> “Actualizar ubicación”

sin utilizar ubicación real.

No crear:

> “ETA”

con un número aleatorio.

Si una función todavía no está implementada, mostrar claramente:

> “Función en desarrollo”

o implementarla correctamente.

---

# 120. BETA

Si no es posible implementar toda la inteligencia de estimación en una primera generación, priorizar:

### BETA 1

* autenticación;
* mapa;
* rutas;
* paradas;
* agregar rutas;
* reportes;
* GPS;
* sesiones de viaje;
* almacenamiento;
* visualización de observaciones;
* ETA básico;
* administración.

### BETA 2

* combinación avanzada de observaciones;
* map matching más preciso;
* predicción;
* frecuencia;
* históricos;
* confianza avanzada;
* detección automática de anomalías.

### BETA 3

* escalamiento;
* optimización;
* mejores modelos predictivos;
* analítica avanzada.

No intentar construir BETA 3 antes de que BETA 1 sea estable.

---

# 121. PRIORIDAD DE IMPLEMENTACIÓN

Orden recomendado:

## Fase 1

Arquitectura + autenticación + base de datos.

## Fase 2

Mapa + rutas + paradas.

## Fase 3

GPS del usuario.

## Fase 4

Sesiones de viaje.

## Fase 5

Observaciones y estimación.

## Fase 6

ETA.

## Fase 7

Reportes.

## Fase 8

Moderación.

## Fase 9

Favoritos/historial/notificaciones.

## Fase 10

Optimización.

---

# 122. TESTING

Crear pruebas para:

* autenticación;
* permisos;
* cálculo de distancia;
* cálculo de velocidad;
* detección de posición;
* ETA;
* filtros;
* creación de rutas;
* edición;
* eliminación;
* reportes;
* roles;
* RLS;
* expiración de incidentes.

Especialmente probar casos como:

* GPS apagado;
* GPS impreciso;
* sin internet;
* ruta sin datos;
* usuario sin sesión;
* usuario no autorizado;
* observación inválida;
* reporte duplicado;
* dos reportes contradictorios.

---

# 123. DEPLOYMENT

Preparar el proyecto para despliegue web.

Preferencias:

* frontend desplegable;
* backend/database remoto;
* variables de entorno;
* HTTPS;
* README.

La geolocalización debe funcionar mediante contexto seguro HTTPS.

---

# 124. DOCUMENTACIÓN

Crear:

`README.md`

Debe explicar:

* proyecto;
* arquitectura;
* instalación;
* variables de entorno;
* base de datos;
* autenticación;
* ejecución local;
* despliegue;
* pruebas;
* permisos GPS;
* decisiones técnicas.

---

# 125. AGENTS.MD

Si el proyecto será trabajado con OpenCode, crear o actualizar:

`AGENTS.md`

con:

* propósito;
* arquitectura;
* reglas del proyecto;
* convenciones;
* comandos;
* estructura;
* restricciones;
* seguridad;
* prohibiciones.

No depender únicamente del contexto del chat.

---

# 126. PLAN DE DESARROLLO

Antes de implementar una funcionalidad grande, producir un pequeño plan:

```text
Objetivo
Archivos afectados
Base de datos afectada
Lógica
Riesgos
Pruebas
```

Después implementarla.

---

# 127. OPEN CODE

El proyecto debe ser compatible con un flujo de desarrollo mediante OpenCode.

Utilizar una separación clara entre:

* planificación;
* investigación;
* implementación;
* pruebas;
* revisión.

No realizar cambios destructivos sin verificar primero el estado del proyecto.

Cuando se encuentre un problema de arquitectura, explicar la causa antes de introducir un workaround frágil.

---

# 128. GOOGLE AI STUDIO

El prompt debe producir una aplicación que pueda ejecutarse en el entorno de Google AI Studio.

Si el entorno genera React por defecto, no luchar contra la herramienta innecesariamente.

Mantener la lógica de negocio separada de la presentación para que posteriormente pueda seguir trabajándose mediante OpenCode.

---

# 129. CÓDIGO

El código debe ser:

* legible;
* modular;
* comentado solo cuando sea necesario;
* consistente;
* reutilizable;
* mantenible.

No generar archivos gigantes de miles de líneas si pueden separarse correctamente.

---

# 130. NO SOBREINGENIERIZAR

No implementar:

* microservicios;
* Kubernetes;
* arquitectura distribuida;
* colas complejas;
* sistemas de IA innecesarios;

para resolver problemas que pueden solucionarse con una arquitectura web normal.

---

# 131. IA

No es obligatorio utilizar una IA generativa dentro de Bus-in-Live.

Si en el futuro se incorpora inteligencia artificial, solo hacerlo si aporta una utilidad real.

El núcleo de:

* ubicación;
* ETA;
* rutas;
* GPS;
* reportes;

debe funcionar sin depender de un chatbot.

---

# 132. REGLA SOBRE MODELOS PREDICTIVOS

Para calcular ETA y ubicación aproximada se pueden utilizar algoritmos estadísticos y geográficos.

No llamar “IA” a un promedio simple.

Documentar el método utilizado.

---

# 133. FUTURA PREDICCIÓN

La arquitectura debe permitir eventualmente incorporar:

* predicción por hora;
* predicción según tráfico;
* predicción por día;
* predicción por segmento;
* detección de anomalías;
* aprendizaje con histórico.

Pero no debe ser obligatorio en la primera versión.

---

# 134. LÓGICA DE CONFIANZA

Crear una función conceptual:

```text
calculateConfidence()
```

que pueda considerar:

* cantidad de observaciones;
* recencia;
* precisión GPS;
* concordancia;
* número de usuarios;
* histórico;
* reportes.

Ejemplo:

```text
Alta:
muchos datos recientes y consistentes

Media:
datos suficientes pero con incertidumbre

Baja:
pocos datos

Insuficiente:
no se puede estimar
```

Los umbrales deben ser configurables.

---

# 135. TRANSPARENCIA

Cuando el sistema no sabe algo, decirlo.

Ejemplo:

> “No podemos determinar con suficiente confianza la ubicación del bus.”

Esto es preferible a mostrar una ubicación falsa.

---

# 136. DISEÑO DE DATOS

No guardar todo indefinidamente.

Separar:

### Raw data

Observaciones GPS temporales.

### Derived data

Velocidades, segmentos, estimaciones.

### Public data

Rutas, paradas y estados.

### Private data

Información de usuario y permisos.

---

# 137. MIGRABILIDAD

Mantener las interfaces de acceso a datos suficientemente separadas para permitir migración entre:

* Supabase;
* Firebase;
* PostgreSQL propio;
* otro backend.

No hace falta implementar todos simultáneamente.

---

# 138. API

Diseñar una capa interna consistente.

Ejemplos:

```text
GET /routes
GET /routes/:id
GET /routes/:id/stops
GET /routes/:id/observations
GET /routes/:id/eta
POST /routes
POST /reports
POST /trip-sessions
POST /location-points
POST /route-change-requests
POST /deletion-requests
```

Los endpoints exactos pueden adaptarse al backend elegido.

---

# 139. TIEMPO REAL

Cuando sea posible utilizar realtime/websockets/subscriptions para:

* observaciones recientes;
* incidentes;
* cambios de estado;
* reportes confirmados.

No hacer polling excesivo.

---

# 140. RENDIMIENTO

No enviar GPS cada pocos milisegundos.

Utilizar intervalos razonables.

Considerar:

* batería;
* datos móviles;
* precisión;
* relevancia del movimiento.

Cuando el usuario esté detenido, reducir frecuencia.

Cuando se mueva, adaptar frecuencia.

---

# 141. BATERÍA

El modo de viaje debe indicar que el GPS puede aumentar el consumo de batería.

Permitir detenerlo fácilmente.

---

# 142. MODO DE BAJO CONSUMO

Posteriormente puede existir una opción:

> “Ahorro de batería”

que reduzca la frecuencia de ubicación.

No es necesario en primera versión si complica demasiado el desarrollo.

---

# 143. BUSCAR PARADAS

Debe poder buscar una parada por:

* nombre;
* cercanía;
* ruta.

---

# 144. MAPA DE RUTA

Al seleccionar una ruta:

* resaltar su recorrido;
* mostrar paradas;
* mostrar buses;
* ocultar información irrelevante;
* permitir volver a vista general.

---

# 145. MULTIRUTA

Un usuario puede seleccionar un conjunto de rutas para compararlas.

Ejemplo:

Ruta 10 + Ruta 12 + Ruta 15.

El mapa muestra únicamente esas rutas.

---

# 146. COMPARACIÓN

Permitir comparar:

* ETA;
* distancia;
* frecuencia;
* estado;
* variante.

---

# 147. CASOS DE ERROR REALES

Considerar:

* un usuario selecciona una ruta incorrecta;
* un bus se aleja de la ruta;
* GPS pierde señal;
* un usuario cambia de bus;
* un usuario se baja;
* un usuario viaja en vehículo privado;
* el usuario camina cerca de la ruta;
* dos buses están muy cerca;
* un bus se detiene durante mucho tiempo;
* hay una desviación.

El sistema debe minimizar la posibilidad de interpretar estos casos como ubicación real de un bus.

---

# 148. CAMBIO DE BUS

Un usuario puede terminar un viaje y empezar otro.

Nunca asumir que continúa en el mismo bus indefinidamente.

---

# 149. DETECCIÓN DE FIN DE VIAJE

Puede existir:

* botón manual;
* falta prolongada de movimiento;
* salida del corredor;
* llegada al destino;

pero cualquier detección automática debe ser prudente.

---

# 150. DATOS DEL USUARIO

No exigir demasiados datos personales.

El sistema debe funcionar con el mínimo necesario.

---

# 151. ELIMINACIÓN DE CUENTA

Preparar una función para:

> “Eliminar mi cuenta”

y definir qué datos:

* se eliminan;
* se anonimizan;
* deben conservarse por integridad del sistema.

---

# 152. TÉRMINOS Y CONDICIONES

Crear estructura para una página de:

* términos;
* privacidad;
* uso del GPS;
* responsabilidad de información estimada;
* contenido comunitario.

No inventar lenguaje legal como si fuera asesoría jurídica.

Utilizar textos claramente identificados como borrador y permitir edición.

---

# 153. ADVERTENCIA SOBRE TRANSPORTE

La aplicación debe aclarar que:

* ETA es aproximado;
* información comunitaria puede contener errores;
* rutas pueden cambiar;
* tráfico puede modificar tiempos;
* GPS puede presentar errores.

---

# 154. NO GARANTIZAR LLEGADAS

Nunca usar texto como:

> “El bus llegará exactamente a las 8:15”.

Utilizar:

> “Llegada estimada: 8:10–8:20”

o

> “Aproximadamente 7 min”.

Cuando la incertidumbre sea alta:

> “ETA no confiable”.

---

# 155. PRIMERA INTERACCIÓN

La aplicación debería explicar rápidamente:

> “Consulta dónde está tu bus, cuándo podría llegar y reporta problemas en tiempo real con ayuda de la comunidad.”

Ese texto puede ser provisional y editable.

---

# 156. IDENTIDAD VISUAL

Nombre provisional:

**bus-in-live**

Utilizarlo únicamente como nombre temporal.

La arquitectura debe permitir cambiar:

* nombre;
* logo;
* favicon;
* colores;
* textos.

sin reescribir la aplicación.

---

# 157. LOGO

No es prioritario en esta primera implementación.

Usar un wordmark/texto provisional y dejar preparado el espacio para reemplazarlo.

---

# 158. ICONOGRAFÍA

Utilizar una biblioteca de iconos estable, preferiblemente SVG.

Ejemplo:

Lucide Icons u otra biblioteca compatible.

---

# 159. MICROINTERACCIONES

Utilizar moderadamente:

* hover;
* transiciones;
* loading;
* estados;
* expansión de tarjetas.

No convertir la app en una animación constante.

---

# 160. RESPONSIVIDAD DE TABLAS

En móvil no utilizar tablas enormes.

Transformarlas en:

* tarjetas;
* acordeones;
* listas.

---

# 161. ADMINISTRACIÓN DE RUTAS

Los administradores deben poder visualizar un mapa de todas las rutas.

Cada ruta:

* color;
* nombre;
* estado;
* número de reportes;
* última actualización.

---

# 162. IMPORTACIÓN FUTURA

Preparar eventualmente una función para importar:

* CSV;
* GeoJSON;
* JSON.

No es obligatorio implementar la importación inicialmente.

---

# 163. EXPORTACIÓN

Posteriormente permitir exportar:

* rutas;
* paradas;
* estadísticas.

No es prioridad de BETA 1.

---

# 164. ESTADOS DE RUTA CALCULADOS

Una ruta puede pasar automáticamente a:

`información insuficiente`

si los datos quedan demasiado antiguos.

No mostrar:

`normal`

simplemente porque el sistema no tiene información.

---

# 165. TIEMPO REAL VS ÚLTIMA INFORMACIÓN

Diferenciar:

> “Tiempo real”

de

> “Última información disponible”.

Si una observación tiene varios minutos de antigüedad, no llamarla “tiempo real”.

---

# 166. CALIDAD DEL DATO

Mostrar cuándo:

* fue observado;
* fue actualizado;
* fue confirmado;
* fue reportado.

---

# 167. RENDIMIENTO DEL MAPA

Evitar cargar cientos/miles de marcadores de manera innecesaria.

Agrupar cuando sea necesario.

Actualizar únicamente elementos relevantes.

---

# 168. SEGURIDAD DE REPORTES

Evitar spam.

Implementar posteriormente:

* rate limits;
* detección de duplicados;
* reportes repetitivos;
* reputación de cuenta si fuera necesario.

---

# 169. REPUTACIÓN

No es prioridad inicial, pero dejar arquitectura compatible con un sistema futuro de:

* usuario confiable;
* reportes confirmados;
* historial de contribuciones.

No utilizarlo para bloquear usuarios arbitrariamente.

---

# 170. DATOS DE UBICACIÓN DE OTROS USUARIOS

No mostrar trayectorias privadas.

La salida pública debe ser algo como:

> “Observación de transporte”

y no:

> “Juan Martínez está aquí”.

---

# 171. MANEJO DE USUARIOS EN ESPERA

Cuando un usuario está en una parada:

Su GPS sirve para:

* localizarlo;
* encontrar paradas;
* sugerir rutas.

No debe convertirse automáticamente en una observación de bus.

---

# 172. INDICACIÓN DE ESTADO DEL USUARIO

Dentro de la aplicación:

* No viajando
* Buscando parada
* Viajando
* Compartiendo ubicación
* Seguimiento detenido

---

# 173. CONFIRMACIÓN DE VIAJE

Antes de comenzar:

> “¿Estás viajando en esta ruta?”

Sí / No

---

# 174. SELECCIÓN DE VARIANTE

Mostrar:

* Directo
* No directo

con explicación breve.

---

# 175. INFORMACIÓN DE DIRECTO

En la interfaz:

> Directo: trayectoria habitual más corta.

> No directo: trayectoria habitual más larga.

No confundir con desvío temporal.

---

# 176. REPORTES DUPLICADOS

Si ya existe un reporte reciente igual:

mostrar:

> “Ya existe un reporte similar. ¿Quieres confirmarlo?”

Esto reduce spam.

---

# 177. INCIDENTES

Tipos mínimos:

* accidente;
* tráfico;
* avería;
* bloqueo;
* desvío;
* suspensión;
* otro.

---

# 178. SEVERIDAD

Puede tener:

* baja;
* media;
* alta;
* crítica.

No usar “crítica” sin una definición razonable.

---

# 179. TIEMPO DEL INCIDENTE

Registrar:

* creado;
* actualizado;
* iniciado;
* finalizado;
* expirado.

---

# 180. DATOS FINALES ESPERADOS DEL PROYECTO

Al terminar una etapa funcional, entregar:

1. Aplicación ejecutable.
2. Código organizado.
3. Base de datos.
4. Esquema.
5. Autenticación.
6. Mapa.
7. GPS.
8. Rutas.
9. Paradas.
10. Reportes.
11. Administración.
12. README.
13. `.env.example`.
14. Pruebas.
15. Documentación de arquitectura.
16. Lista de limitaciones reales.

---

# 181. LIMITACIONES

El sistema debe incluir un documento o sección:

> Limitaciones conocidas

Ejemplos:

* dependencia de señal GPS;
* dependencia de conexión;
* ETA estimado;
* ausencia de usuarios suficientes;
* datos comunitarios;
* limitaciones del navegador;
* limitaciones del proveedor de mapas.

No ocultar limitaciones para que el proyecto parezca más avanzado.

---

# 182. CRITERIOS DE ACEPTACIÓN PRINCIPALES

La primera versión será considerada funcional si:

### Autenticación

Un usuario puede registrarse e iniciar sesión.

### Mapa

Puede visualizar un mapa y rutas existentes.

### Comunidad

Puede crear una ruta.

### Paradas

Puede agregar y consultar paradas.

### GPS

Puede activar la ubicación.

### Viaje

Puede indicar que está viajando.

### Observación

La posición puede almacenarse o procesarse correctamente.

### ETA

Existe un ETA calculado cuando hay datos suficientes.

### Reportes

Puede reportar incidencias.

### Moderación

Un administrador puede revisar reportes.

### Rutas

Un usuario puede solicitar cambios.

### Eliminación

Un usuario no puede eliminar una ruta directamente.

### Privacidad

El usuario puede detener el GPS.

### Responsive

La aplicación funciona correctamente en móvil y PC.

---

# 183. CRITERIO FUNDAMENTAL

El proyecto no debe intentar aparentar que sabe más de lo que realmente sabe.

Si tiene:

* una observación,
  debe decir que tiene una observación.

Si tiene:

* diez observaciones consistentes,
  puede generar una mejor estimación.

Si no tiene datos:

debe decir que no tiene datos.

La confiabilidad del proyecto es más importante que mostrar una pantalla llena de información.

---

# 184. ORDEN FINAL DE TRABAJO

Primero:

**ANALIZA.**

Después:

**PREGUNTA SOLO LO NECESARIO.**

Después:

**PROPÓN ARQUITECTURA.**

Después:

**IMPLEMENTA LA BASE.**

Después:

**IMPLEMENTA FUNCIONALIDADES.**

Después:

**PRUEBA.**

Después:

**REVISA SEGURIDAD Y PRIVACIDAD.**

Después:

**REVISA RESPONSIVE.**

Después:

**REVISA CALIDAD DEL CÓDIGO.**

Finalmente:

**EXPLICA QUÉ FUNCIONA, QUÉ NO FUNCIONA TODAVÍA Y QUÉ FALTA.**

No declares una funcionalidad como terminada si únicamente existe su interfaz.

---

# 185. REGLA FINAL

No te limites a generar una maqueta.

Construye una aplicación web funcional y extensible.

No inventes datos.

No escondas limitaciones.

No asumas que todos los buses tienen GPS propio.

Utiliza la comunidad como fuente de datos.

Utiliza GPS únicamente con consentimiento.

Utiliza estimaciones cuando corresponda.

Muestra el grado de confianza.

Diferencia claramente:

* ruta normal;
* variante directa;
* variante no directa;
* desviación;
* desviación temporal;
* suspensión;
* información insuficiente.

El objetivo es construir una plataforma que realmente pueda comenzar siendo pequeña en Santa Ana y posteriormente crecer a otras ciudades de El Salvador.

NOMBRE PROVISIONAL:

**bus-in-live**

IDIOMA DE LA INTERFAZ:

**Español**

ÁREA INICIAL:

**Santa Ana, El Salvador**

PLATAFORMA:

**Aplicación web responsive para celular y computadora**

COSTO PARA EL USUARIO:

**Sin pago**

PRIORIDAD:

**Datos reales + funcionalidad real + transparencia + privacidad + facilidad de uso.**
