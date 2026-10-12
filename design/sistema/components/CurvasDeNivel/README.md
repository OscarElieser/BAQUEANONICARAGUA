# CurvasDeNivel

Motivo de relieve: elipses concéntricas en `oro` que dibujan un volcán o cerro, con opacidad creciente hacia la cima.

- Uso: portada (atlas), cabecera de territorio y de destino, estados vacíos del mapa.
- 4–7 anillos por cima, opacidades 0.15 → 0.95, trazo 1.2–1.4px (2px el anillo de la cima).
- Cima activa: punto `terracota` de 5px; otra cima: punto `oro`.
- Es decorativo (`aria-hidden`) salvo cuando nombra un lugar; entonces `role="img"` con `aria-label` (“Curvas de nivel de los dos volcanes de la isla de Ometepe”).
- Animación: solo al entrar al atlas, los anillos aparecen de la base a la cima (≤ 900 ms). Sin animación con `prefers-reduced-motion`.
- En el mapa real, curvas generadas desde un modelo de elevación con licencia, no a mano.
