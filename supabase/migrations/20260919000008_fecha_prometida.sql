-- Fecha que el taller le prometió al cliente para entregar el vehículo
-- ("¿cuándo lo tenés?"). Es opcional: solo día, sin hora. Es distinta de
-- fecha_entrega, que se completa sola cuando el servicio pasa a Entregado.
-- Las policies de RLS de servicios ya cubren la columna nueva.

alter table public.servicios
  add column fecha_prometida date;
