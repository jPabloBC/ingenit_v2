-- Normalización catálogo de precios para IngenIT_v2
-- Objetivo: asegurar cobertura completa de servicios de SERVICE_CATEGORIES para Chile.
-- No elimina datos históricos.

begin;

-- Parámetros de ejecución
with params as (
	select
		'f6afc182-3e8e-43a8-810d-d47509e7c8e1'::uuid as target_app_id,
		'Chile'::text as target_country,
		'CLP'::text as target_currency
),
catalog(service_id, service_name, category_name, default_base_price) as (
	values
	-- Desarrollo Web
	('desarrollo_pagina_web','Desarrollo Página Web','Desarrollo Web',650000),
	('desarrollo_landing_page','Desarrollo Landing Page','Desarrollo Web',450000),
	('desarrollo_sitio_corporativo','Desarrollo Sitio Corporativo','Desarrollo Web',1200000),
	('desarrollo_ecommerce','Desarrollo E-commerce','Desarrollo Web',1800000),
	('desarrollo_cms_wordpress','Desarrollo CMS WordPress','Desarrollo Web',850000),
	('desarrollo_portal_web','Desarrollo Portal Web','Desarrollo Web',2200000),
	('desarrollo_cms_personalizado','Desarrollo CMS Personalizado','Desarrollo Web',1400000),

	-- Desarrollo Móvil
	('desarrollo_app_movil_ios','Desarrollo App iOS','Desarrollo Móvil',2200000),
	('desarrollo_app_movil_android','Desarrollo App Android','Desarrollo Móvil',2200000),
	('desarrollo_app_hibrida','Desarrollo App Híbrida','Desarrollo Móvil',1800000),
	('desarrollo_app_react_native','Desarrollo App React Native','Desarrollo Móvil',1900000),
	('desarrollo_app_flutter','Desarrollo App Flutter','Desarrollo Móvil',1900000),
	('desarrollo_app_web_progressive','Desarrollo App Web Progressive','Desarrollo Móvil',1200000),

	-- Desarrollo Backend
	('desarrollo_api_rest','Desarrollo API REST','Desarrollo Backend',850000),
	('desarrollo_api_graphql','Desarrollo API GraphQL','Desarrollo Backend',1200000),
	('desarrollo_microservicios','Desarrollo Microservicios','Desarrollo Backend',1900000),
	('desarrollo_backend_nodejs','Desarrollo Backend Node.js','Desarrollo Backend',850000),
	('desarrollo_backend_python','Desarrollo Backend Python','Desarrollo Backend',900000),
	('desarrollo_backend_java','Desarrollo Backend Java','Desarrollo Backend',1200000),
	('desarrollo_backend_php','Desarrollo Backend PHP','Desarrollo Backend',700000),

	-- Desarrollo Frontend
	('desarrollo_frontend_react','Desarrollo Frontend React','Desarrollo Frontend',700000),
	('desarrollo_frontend_vue','Desarrollo Frontend Vue','Desarrollo Frontend',700000),
	('desarrollo_frontend_angular','Desarrollo Frontend Angular','Desarrollo Frontend',900000),
	('diseño_ui_ux','Diseño UI/UX','Desarrollo Frontend',350000),
	('diseño_prototipo','Diseño de Prototipo','Desarrollo Frontend',450000),
	('diseño_sistema_design','Diseño Sistema Design','Desarrollo Frontend',650000),
	('diseño_logo_branding','Diseño Logo y Branding','Desarrollo Frontend',300000),

	-- Integración y Automatización
	('integracion_api_terceros','Integración API Terceros','Integración y Automatización',700000),
	('integracion_payment_gateway','Integración Payment Gateway','Integración y Automatización',650000),
	('integracion_crm','Integración CRM','Integración y Automatización',900000),
	('integracion_erp','Integración ERP','Integración y Automatización',1300000),
	('automatizacion_procesos','Automatización de Procesos','Integración y Automatización',1100000),
	('desarrollo_bot_chat','Desarrollo Bot Chat','Integración y Automatización',900000),
	('integracion_webhook','Integración Webhook','Integración y Automatización',500000),

	-- Testing y Calidad
	('testing_unitario','Testing Unitario','Testing y Calidad',300000),
	('testing_integracion','Testing de Integración','Testing y Calidad',500000),
	('testing_automation','Testing Automation','Testing y Calidad',800000),
	('testing_seguridad','Testing de Seguridad','Testing y Calidad',1200000),
	('testing_performance','Testing de Performance','Testing y Calidad',700000),
	('testing_usabilidad','Testing de Usabilidad','Testing y Calidad',450000),

	-- DevOps y Deployment
	('configuracion_ci_cd','Configuración CI/CD','DevOps y Deployment',850000),
	('configuracion_docker','Configuración Docker','DevOps y Deployment',500000),
	('configuracion_kubernetes','Configuración Kubernetes','DevOps y Deployment',1400000),
	('configuracion_jenkins','Configuración Jenkins','DevOps y Deployment',650000),
	('deployment_produccion','Deployment a Producción','DevOps y Deployment',400000),
	('monitoreo_aplicacion','Monitoreo de Aplicación','DevOps y Deployment',500000),

	-- Soluciones Empresariales
	('desarrollo_erp_personalizado','Desarrollo ERP Personalizado','Soluciones Empresariales',5000000),
	('desarrollo_crm_personalizado','Desarrollo CRM Personalizado','Soluciones Empresariales',3500000),
	('desarrollo_sistema_inventario','Desarrollo Sistema Inventario','Soluciones Empresariales',2500000),
	('desarrollo_sistema_facturacion','Desarrollo Sistema Facturación','Soluciones Empresariales',2300000),
	('desarrollo_sistema_contabilidad','Desarrollo Sistema Contabilidad','Soluciones Empresariales',2700000),
	('desarrollo_sistema_rrhh','Desarrollo Sistema RRHH','Soluciones Empresariales',3000000),

	-- Desarrollo Especializado
	('desarrollo_ia_machine_learning','Desarrollo IA/Machine Learning','Desarrollo Especializado',3500000),
	('desarrollo_blockchain','Desarrollo Blockchain','Desarrollo Especializado',3200000),
	('desarrollo_iot','Desarrollo IoT','Desarrollo Especializado',2600000),
	('desarrollo_realidad_aumentada','Desarrollo Realidad Aumentada','Desarrollo Especializado',2800000),
	('desarrollo_chatbot_ai','Desarrollo Chatbot AI','Desarrollo Especializado',1400000),
	('desarrollo_sistema_recomendacion','Desarrollo Sistema Recomendación','Desarrollo Especializado',2200000),

	-- Consultoría y Planificación
	('consultoria_arquitectura','Consultoría Arquitectura','Consultoría y Planificación',450000),
	('consultoria_tecnologia','Consultoría Tecnología','Consultoría y Planificación',380000),
	('planificacion_proyecto','Planificación de Proyecto','Consultoría y Planificación',300000),
	('analisis_requerimientos','Análisis de Requerimientos','Consultoría y Planificación',260000),
	('documentacion_tecnica','Documentación Técnica','Consultoría y Planificación',220000),
	('capacitacion_usuarios','Capacitación de Usuarios','Consultoría y Planificación',280000),

	-- Servicios TI
	('instalacion_redes','Instalación de Redes','Servicios TI',900000),
	('cableado_estructurado','Cableado Estructurado','Servicios TI',650000),
	('wifi_enterprise','WiFi Enterprise','Servicios TI',700000),
	('switches_enterprise','Switches Enterprise','Servicios TI',850000),
	('vpn_enterprise','VPN Enterprise','Servicios TI',800000),
	('seguridad_red','Seguridad de Red','Servicios TI',1200000),
	('monitoreo_red','Monitoreo de Red','Servicios TI',700000),
	('backup_enterprise','Backup Enterprise','Servicios TI',750000),
	('voip_enterprise','VoIP Enterprise','Servicios TI',800000),
	('mantenimiento_sistemas','Mantenimiento de Sistemas','Servicios TI',650000),
	('consultoria_it','Consultoría IT','Servicios TI',500000),
	('soporte_tecnico','Soporte Técnico','Servicios TI',450000)
),
legacy_mapped as (
	select
		id,
		case
			when lower(trim(category)) in ('servicios_desarrollo','desarrollo_web','web') then 'Desarrollo Web'
			when lower(trim(category)) in ('desarrollo_movil','mobile') then 'Desarrollo Móvil'
			when lower(trim(category)) in ('desarrollo_backend','backend') then 'Desarrollo Backend'
			when lower(trim(category)) in ('desarrollo_frontend','frontend') then 'Desarrollo Frontend'
			when lower(trim(category)) in ('integracion_automatizacion','integracion','automation') then 'Integración y Automatización'
			when lower(trim(category)) in ('testing_quality','testing','qa') then 'Testing y Calidad'
			when lower(trim(category)) in ('devops_deployment','devops') then 'DevOps y Deployment'
			when lower(trim(category)) in ('soluciones_empresariales','enterprise_solutions') then 'Soluciones Empresariales'
			when lower(trim(category)) in ('desarrollo_especializado','specialized') then 'Desarrollo Especializado'
			when lower(trim(category)) in ('consultoria_planificacion','consultoria','planning') then 'Consultoría y Planificación'
			when lower(trim(category)) in ('servicios_ti','it_services','it') then 'Servicios TI'
			else category
		end as normalized_category
	from public.rt_pricing_library
)
-- 1) Normalizar categorías legacy en todos los registros existentes
update public.rt_pricing_library t
set category = lm.normalized_category
from legacy_mapped lm
where t.id = lm.id
	and coalesce(t.category, '') <> coalesce(lm.normalized_category, '');

-- 2) Actualizar registros existentes para catálogo Chile+app objetivo
with params as (
	select
		'f6afc182-3e8e-43a8-810d-d47509e7c8e1'::uuid as target_app_id,
		'Chile'::text as target_country,
		'CLP'::text as target_currency
),
catalog(service_id, service_name, category_name, default_base_price) as (
	values
	('desarrollo_pagina_web','Desarrollo Página Web','Desarrollo Web',650000),
	('desarrollo_landing_page','Desarrollo Landing Page','Desarrollo Web',450000),
	('desarrollo_sitio_corporativo','Desarrollo Sitio Corporativo','Desarrollo Web',1200000),
	('desarrollo_ecommerce','Desarrollo E-commerce','Desarrollo Web',1800000),
	('desarrollo_cms_wordpress','Desarrollo CMS WordPress','Desarrollo Web',850000),
	('desarrollo_portal_web','Desarrollo Portal Web','Desarrollo Web',2200000),
	('desarrollo_cms_personalizado','Desarrollo CMS Personalizado','Desarrollo Web',1400000),
	('desarrollo_app_movil_ios','Desarrollo App iOS','Desarrollo Móvil',2200000),
	('desarrollo_app_movil_android','Desarrollo App Android','Desarrollo Móvil',2200000),
	('desarrollo_app_hibrida','Desarrollo App Híbrida','Desarrollo Móvil',1800000),
	('desarrollo_app_react_native','Desarrollo App React Native','Desarrollo Móvil',1900000),
	('desarrollo_app_flutter','Desarrollo App Flutter','Desarrollo Móvil',1900000),
	('desarrollo_app_web_progressive','Desarrollo App Web Progressive','Desarrollo Móvil',1200000),
	('desarrollo_api_rest','Desarrollo API REST','Desarrollo Backend',850000),
	('desarrollo_api_graphql','Desarrollo API GraphQL','Desarrollo Backend',1200000),
	('desarrollo_microservicios','Desarrollo Microservicios','Desarrollo Backend',1900000),
	('desarrollo_backend_nodejs','Desarrollo Backend Node.js','Desarrollo Backend',850000),
	('desarrollo_backend_python','Desarrollo Backend Python','Desarrollo Backend',900000),
	('desarrollo_backend_java','Desarrollo Backend Java','Desarrollo Backend',1200000),
	('desarrollo_backend_php','Desarrollo Backend PHP','Desarrollo Backend',700000),
	('desarrollo_frontend_react','Desarrollo Frontend React','Desarrollo Frontend',700000),
	('desarrollo_frontend_vue','Desarrollo Frontend Vue','Desarrollo Frontend',700000),
	('desarrollo_frontend_angular','Desarrollo Frontend Angular','Desarrollo Frontend',900000),
	('diseño_ui_ux','Diseño UI/UX','Desarrollo Frontend',350000),
	('diseño_prototipo','Diseño de Prototipo','Desarrollo Frontend',450000),
	('diseño_sistema_design','Diseño Sistema Design','Desarrollo Frontend',650000),
	('diseño_logo_branding','Diseño Logo y Branding','Desarrollo Frontend',300000),
	('integracion_api_terceros','Integración API Terceros','Integración y Automatización',700000),
	('integracion_payment_gateway','Integración Payment Gateway','Integración y Automatización',650000),
	('integracion_crm','Integración CRM','Integración y Automatización',900000),
	('integracion_erp','Integración ERP','Integración y Automatización',1300000),
	('automatizacion_procesos','Automatización de Procesos','Integración y Automatización',1100000),
	('desarrollo_bot_chat','Desarrollo Bot Chat','Integración y Automatización',900000),
	('integracion_webhook','Integración Webhook','Integración y Automatización',500000),
	('testing_unitario','Testing Unitario','Testing y Calidad',300000),
	('testing_integracion','Testing de Integración','Testing y Calidad',500000),
	('testing_automation','Testing Automation','Testing y Calidad',800000),
	('testing_seguridad','Testing de Seguridad','Testing y Calidad',1200000),
	('testing_performance','Testing de Performance','Testing y Calidad',700000),
	('testing_usabilidad','Testing de Usabilidad','Testing y Calidad',450000),
	('configuracion_ci_cd','Configuración CI/CD','DevOps y Deployment',850000),
	('configuracion_docker','Configuración Docker','DevOps y Deployment',500000),
	('configuracion_kubernetes','Configuración Kubernetes','DevOps y Deployment',1400000),
	('configuracion_jenkins','Configuración Jenkins','DevOps y Deployment',650000),
	('deployment_produccion','Deployment a Producción','DevOps y Deployment',400000),
	('monitoreo_aplicacion','Monitoreo de Aplicación','DevOps y Deployment',500000),
	('desarrollo_erp_personalizado','Desarrollo ERP Personalizado','Soluciones Empresariales',5000000),
	('desarrollo_crm_personalizado','Desarrollo CRM Personalizado','Soluciones Empresariales',3500000),
	('desarrollo_sistema_inventario','Desarrollo Sistema Inventario','Soluciones Empresariales',2500000),
	('desarrollo_sistema_facturacion','Desarrollo Sistema Facturación','Soluciones Empresariales',2300000),
	('desarrollo_sistema_contabilidad','Desarrollo Sistema Contabilidad','Soluciones Empresariales',2700000),
	('desarrollo_sistema_rrhh','Desarrollo Sistema RRHH','Soluciones Empresariales',3000000),
	('desarrollo_ia_machine_learning','Desarrollo IA/Machine Learning','Desarrollo Especializado',3500000),
	('desarrollo_blockchain','Desarrollo Blockchain','Desarrollo Especializado',3200000),
	('desarrollo_iot','Desarrollo IoT','Desarrollo Especializado',2600000),
	('desarrollo_realidad_aumentada','Desarrollo Realidad Aumentada','Desarrollo Especializado',2800000),
	('desarrollo_chatbot_ai','Desarrollo Chatbot AI','Desarrollo Especializado',1400000),
	('desarrollo_sistema_recomendacion','Desarrollo Sistema Recomendación','Desarrollo Especializado',2200000),
	('consultoria_arquitectura','Consultoría Arquitectura','Consultoría y Planificación',450000),
	('consultoria_tecnologia','Consultoría Tecnología','Consultoría y Planificación',380000),
	('planificacion_proyecto','Planificación de Proyecto','Consultoría y Planificación',300000),
	('analisis_requerimientos','Análisis de Requerimientos','Consultoría y Planificación',260000),
	('documentacion_tecnica','Documentación Técnica','Consultoría y Planificación',220000),
	('capacitacion_usuarios','Capacitación de Usuarios','Consultoría y Planificación',280000),
	('instalacion_redes','Instalación de Redes','Servicios TI',900000),
	('cableado_estructurado','Cableado Estructurado','Servicios TI',650000),
	('wifi_enterprise','WiFi Enterprise','Servicios TI',700000),
	('switches_enterprise','Switches Enterprise','Servicios TI',850000),
	('vpn_enterprise','VPN Enterprise','Servicios TI',800000),
	('seguridad_red','Seguridad de Red','Servicios TI',1200000),
	('monitoreo_red','Monitoreo de Red','Servicios TI',700000),
	('backup_enterprise','Backup Enterprise','Servicios TI',750000),
	('voip_enterprise','VoIP Enterprise','Servicios TI',800000),
	('mantenimiento_sistemas','Mantenimiento de Sistemas','Servicios TI',650000),
	('consultoria_it','Consultoría IT','Servicios TI',500000),
	('soporte_tecnico','Soporte Técnico','Servicios TI',450000)
)
update public.rt_pricing_library p
set
	service_name = c.service_name,
	category = c.category_name,
	country = (select target_country from params),
	currency = (select target_currency from params),
	base_price = case
		when p.base_price is null or p.base_price < 100000 then c.default_base_price
		else p.base_price
	end,
	unit_prices = coalesce(p.unit_prices, '{}'::jsonb),
	is_active = true,
	app_id = (select target_app_id from params),
	updated_at = now()
from catalog c
where p.service_id = c.service_id
	and lower(trim(coalesce(p.country, ''))) = 'chile'
	and p.app_id = (select target_app_id from params);

-- 3) Insertar faltantes del catálogo para Chile+app objetivo (sin borrar ni pisar históricos)
with params as (
	select
		'f6afc182-3e8e-43a8-810d-d47509e7c8e1'::uuid as target_app_id,
		'Chile'::text as target_country,
		'CLP'::text as target_currency
),
catalog(service_id, service_name, category_name, default_base_price) as (
	values
	('desarrollo_pagina_web','Desarrollo Página Web','Desarrollo Web',650000),
	('desarrollo_landing_page','Desarrollo Landing Page','Desarrollo Web',450000),
	('desarrollo_sitio_corporativo','Desarrollo Sitio Corporativo','Desarrollo Web',1200000),
	('desarrollo_ecommerce','Desarrollo E-commerce','Desarrollo Web',1800000),
	('desarrollo_cms_wordpress','Desarrollo CMS WordPress','Desarrollo Web',850000),
	('desarrollo_portal_web','Desarrollo Portal Web','Desarrollo Web',2200000),
	('desarrollo_cms_personalizado','Desarrollo CMS Personalizado','Desarrollo Web',1400000),
	('desarrollo_app_movil_ios','Desarrollo App iOS','Desarrollo Móvil',2200000),
	('desarrollo_app_movil_android','Desarrollo App Android','Desarrollo Móvil',2200000),
	('desarrollo_app_hibrida','Desarrollo App Híbrida','Desarrollo Móvil',1800000),
	('desarrollo_app_react_native','Desarrollo App React Native','Desarrollo Móvil',1900000),
	('desarrollo_app_flutter','Desarrollo App Flutter','Desarrollo Móvil',1900000),
	('desarrollo_app_web_progressive','Desarrollo App Web Progressive','Desarrollo Móvil',1200000),
	('desarrollo_api_rest','Desarrollo API REST','Desarrollo Backend',850000),
	('desarrollo_api_graphql','Desarrollo API GraphQL','Desarrollo Backend',1200000),
	('desarrollo_microservicios','Desarrollo Microservicios','Desarrollo Backend',1900000),
	('desarrollo_backend_nodejs','Desarrollo Backend Node.js','Desarrollo Backend',850000),
	('desarrollo_backend_python','Desarrollo Backend Python','Desarrollo Backend',900000),
	('desarrollo_backend_java','Desarrollo Backend Java','Desarrollo Backend',1200000),
	('desarrollo_backend_php','Desarrollo Backend PHP','Desarrollo Backend',700000),
	('desarrollo_frontend_react','Desarrollo Frontend React','Desarrollo Frontend',700000),
	('desarrollo_frontend_vue','Desarrollo Frontend Vue','Desarrollo Frontend',700000),
	('desarrollo_frontend_angular','Desarrollo Frontend Angular','Desarrollo Frontend',900000),
	('diseño_ui_ux','Diseño UI/UX','Desarrollo Frontend',350000),
	('diseño_prototipo','Diseño de Prototipo','Desarrollo Frontend',450000),
	('diseño_sistema_design','Diseño Sistema Design','Desarrollo Frontend',650000),
	('diseño_logo_branding','Diseño Logo y Branding','Desarrollo Frontend',300000),
	('integracion_api_terceros','Integración API Terceros','Integración y Automatización',700000),
	('integracion_payment_gateway','Integración Payment Gateway','Integración y Automatización',650000),
	('integracion_crm','Integración CRM','Integración y Automatización',900000),
	('integracion_erp','Integración ERP','Integración y Automatización',1300000),
	('automatizacion_procesos','Automatización de Procesos','Integración y Automatización',1100000),
	('desarrollo_bot_chat','Desarrollo Bot Chat','Integración y Automatización',900000),
	('integracion_webhook','Integración Webhook','Integración y Automatización',500000),
	('testing_unitario','Testing Unitario','Testing y Calidad',300000),
	('testing_integracion','Testing de Integración','Testing y Calidad',500000),
	('testing_automation','Testing Automation','Testing y Calidad',800000),
	('testing_seguridad','Testing de Seguridad','Testing y Calidad',1200000),
	('testing_performance','Testing de Performance','Testing y Calidad',700000),
	('testing_usabilidad','Testing de Usabilidad','Testing y Calidad',450000),
	('configuracion_ci_cd','Configuración CI/CD','DevOps y Deployment',850000),
	('configuracion_docker','Configuración Docker','DevOps y Deployment',500000),
	('configuracion_kubernetes','Configuración Kubernetes','DevOps y Deployment',1400000),
	('configuracion_jenkins','Configuración Jenkins','DevOps y Deployment',650000),
	('deployment_produccion','Deployment a Producción','DevOps y Deployment',400000),
	('monitoreo_aplicacion','Monitoreo de Aplicación','DevOps y Deployment',500000),
	('desarrollo_erp_personalizado','Desarrollo ERP Personalizado','Soluciones Empresariales',5000000),
	('desarrollo_crm_personalizado','Desarrollo CRM Personalizado','Soluciones Empresariales',3500000),
	('desarrollo_sistema_inventario','Desarrollo Sistema Inventario','Soluciones Empresariales',2500000),
	('desarrollo_sistema_facturacion','Desarrollo Sistema Facturación','Soluciones Empresariales',2300000),
	('desarrollo_sistema_contabilidad','Desarrollo Sistema Contabilidad','Soluciones Empresariales',2700000),
	('desarrollo_sistema_rrhh','Desarrollo Sistema RRHH','Soluciones Empresariales',3000000),
	('desarrollo_ia_machine_learning','Desarrollo IA/Machine Learning','Desarrollo Especializado',3500000),
	('desarrollo_blockchain','Desarrollo Blockchain','Desarrollo Especializado',3200000),
	('desarrollo_iot','Desarrollo IoT','Desarrollo Especializado',2600000),
	('desarrollo_realidad_aumentada','Desarrollo Realidad Aumentada','Desarrollo Especializado',2800000),
	('desarrollo_chatbot_ai','Desarrollo Chatbot AI','Desarrollo Especializado',1400000),
	('desarrollo_sistema_recomendacion','Desarrollo Sistema Recomendación','Desarrollo Especializado',2200000),
	('consultoria_arquitectura','Consultoría Arquitectura','Consultoría y Planificación',450000),
	('consultoria_tecnologia','Consultoría Tecnología','Consultoría y Planificación',380000),
	('planificacion_proyecto','Planificación de Proyecto','Consultoría y Planificación',300000),
	('analisis_requerimientos','Análisis de Requerimientos','Consultoría y Planificación',260000),
	('documentacion_tecnica','Documentación Técnica','Consultoría y Planificación',220000),
	('capacitacion_usuarios','Capacitación de Usuarios','Consultoría y Planificación',280000),
	('instalacion_redes','Instalación de Redes','Servicios TI',900000),
	('cableado_estructurado','Cableado Estructurado','Servicios TI',650000),
	('wifi_enterprise','WiFi Enterprise','Servicios TI',700000),
	('switches_enterprise','Switches Enterprise','Servicios TI',850000),
	('vpn_enterprise','VPN Enterprise','Servicios TI',800000),
	('seguridad_red','Seguridad de Red','Servicios TI',1200000),
	('monitoreo_red','Monitoreo de Red','Servicios TI',700000),
	('backup_enterprise','Backup Enterprise','Servicios TI',750000),
	('voip_enterprise','VoIP Enterprise','Servicios TI',800000),
	('mantenimiento_sistemas','Mantenimiento de Sistemas','Servicios TI',650000),
	('consultoria_it','Consultoría IT','Servicios TI',500000),
	('soporte_tecnico','Soporte Técnico','Servicios TI',450000)
)
insert into public.rt_pricing_library (
	id,
	service_id,
	service_name,
	category,
	country,
	currency,
	base_price,
	unit_prices,
	description,
	is_active,
	app_id,
	created_at,
	updated_at
)
select
	gen_random_uuid(),
	c.service_id,
	c.service_name,
	c.category_name,
	(select target_country from params),
	(select target_currency from params),
	c.default_base_price,
	'{}'::jsonb,
	'Seed catálogo SERVICE_CATEGORIES (normalización)',
	true,
	(select target_app_id from params),
	now(),
	now()
from catalog c
where not exists (
	select 1
	from public.rt_pricing_library p
	where p.service_id = c.service_id
		and lower(trim(coalesce(p.country, ''))) = 'chile'
		and p.app_id = (select target_app_id from params)
		and p.is_active = true
);

commit;

-- =====================
-- VALIDACIONES FINALES
-- =====================

-- A) Servicios del catálogo SIN precio activo Chile+app
with params as (
	select 'f6afc182-3e8e-43a8-810d-d47509e7c8e1'::uuid as target_app_id
),
catalog(service_id, service_name, category_name) as (
	values
	('desarrollo_pagina_web','Desarrollo Página Web','Desarrollo Web'),
	('desarrollo_landing_page','Desarrollo Landing Page','Desarrollo Web'),
	('desarrollo_sitio_corporativo','Desarrollo Sitio Corporativo','Desarrollo Web'),
	('desarrollo_ecommerce','Desarrollo E-commerce','Desarrollo Web'),
	('desarrollo_cms_wordpress','Desarrollo CMS WordPress','Desarrollo Web'),
	('desarrollo_portal_web','Desarrollo Portal Web','Desarrollo Web'),
	('desarrollo_cms_personalizado','Desarrollo CMS Personalizado','Desarrollo Web'),
	('desarrollo_app_movil_ios','Desarrollo App iOS','Desarrollo Móvil'),
	('desarrollo_app_movil_android','Desarrollo App Android','Desarrollo Móvil'),
	('desarrollo_app_hibrida','Desarrollo App Híbrida','Desarrollo Móvil'),
	('desarrollo_app_react_native','Desarrollo App React Native','Desarrollo Móvil'),
	('desarrollo_app_flutter','Desarrollo App Flutter','Desarrollo Móvil'),
	('desarrollo_app_web_progressive','Desarrollo App Web Progressive','Desarrollo Móvil'),
	('desarrollo_api_rest','Desarrollo API REST','Desarrollo Backend'),
	('desarrollo_api_graphql','Desarrollo API GraphQL','Desarrollo Backend'),
	('desarrollo_microservicios','Desarrollo Microservicios','Desarrollo Backend'),
	('desarrollo_backend_nodejs','Desarrollo Backend Node.js','Desarrollo Backend'),
	('desarrollo_backend_python','Desarrollo Backend Python','Desarrollo Backend'),
	('desarrollo_backend_java','Desarrollo Backend Java','Desarrollo Backend'),
	('desarrollo_backend_php','Desarrollo Backend PHP','Desarrollo Backend'),
	('desarrollo_frontend_react','Desarrollo Frontend React','Desarrollo Frontend'),
	('desarrollo_frontend_vue','Desarrollo Frontend Vue','Desarrollo Frontend'),
	('desarrollo_frontend_angular','Desarrollo Frontend Angular','Desarrollo Frontend'),
	('diseño_ui_ux','Diseño UI/UX','Desarrollo Frontend'),
	('diseño_prototipo','Diseño de Prototipo','Desarrollo Frontend'),
	('diseño_sistema_design','Diseño Sistema Design','Desarrollo Frontend'),
	('diseño_logo_branding','Diseño Logo y Branding','Desarrollo Frontend'),
	('integracion_api_terceros','Integración API Terceros','Integración y Automatización'),
	('integracion_payment_gateway','Integración Payment Gateway','Integración y Automatización'),
	('integracion_crm','Integración CRM','Integración y Automatización'),
	('integracion_erp','Integración ERP','Integración y Automatización'),
	('automatizacion_procesos','Automatización de Procesos','Integración y Automatización'),
	('desarrollo_bot_chat','Desarrollo Bot Chat','Integración y Automatización'),
	('integracion_webhook','Integración Webhook','Integración y Automatización'),
	('testing_unitario','Testing Unitario','Testing y Calidad'),
	('testing_integracion','Testing de Integración','Testing y Calidad'),
	('testing_automation','Testing Automation','Testing y Calidad'),
	('testing_seguridad','Testing de Seguridad','Testing y Calidad'),
	('testing_performance','Testing de Performance','Testing y Calidad'),
	('testing_usabilidad','Testing de Usabilidad','Testing y Calidad'),
	('configuracion_ci_cd','Configuración CI/CD','DevOps y Deployment'),
	('configuracion_docker','Configuración Docker','DevOps y Deployment'),
	('configuracion_kubernetes','Configuración Kubernetes','DevOps y Deployment'),
	('configuracion_jenkins','Configuración Jenkins','DevOps y Deployment'),
	('deployment_produccion','Deployment a Producción','DevOps y Deployment'),
	('monitoreo_aplicacion','Monitoreo de Aplicación','DevOps y Deployment'),
	('desarrollo_erp_personalizado','Desarrollo ERP Personalizado','Soluciones Empresariales'),
	('desarrollo_crm_personalizado','Desarrollo CRM Personalizado','Soluciones Empresariales'),
	('desarrollo_sistema_inventario','Desarrollo Sistema Inventario','Soluciones Empresariales'),
	('desarrollo_sistema_facturacion','Desarrollo Sistema Facturación','Soluciones Empresariales'),
	('desarrollo_sistema_contabilidad','Desarrollo Sistema Contabilidad','Soluciones Empresariales'),
	('desarrollo_sistema_rrhh','Desarrollo Sistema RRHH','Soluciones Empresariales'),
	('desarrollo_ia_machine_learning','Desarrollo IA/Machine Learning','Desarrollo Especializado'),
	('desarrollo_blockchain','Desarrollo Blockchain','Desarrollo Especializado'),
	('desarrollo_iot','Desarrollo IoT','Desarrollo Especializado'),
	('desarrollo_realidad_aumentada','Desarrollo Realidad Aumentada','Desarrollo Especializado'),
	('desarrollo_chatbot_ai','Desarrollo Chatbot AI','Desarrollo Especializado'),
	('desarrollo_sistema_recomendacion','Desarrollo Sistema Recomendación','Desarrollo Especializado'),
	('consultoria_arquitectura','Consultoría Arquitectura','Consultoría y Planificación'),
	('consultoria_tecnologia','Consultoría Tecnología','Consultoría y Planificación'),
	('planificacion_proyecto','Planificación de Proyecto','Consultoría y Planificación'),
	('analisis_requerimientos','Análisis de Requerimientos','Consultoría y Planificación'),
	('documentacion_tecnica','Documentación Técnica','Consultoría y Planificación'),
	('capacitacion_usuarios','Capacitación de Usuarios','Consultoría y Planificación'),
	('instalacion_redes','Instalación de Redes','Servicios TI'),
	('cableado_estructurado','Cableado Estructurado','Servicios TI'),
	('wifi_enterprise','WiFi Enterprise','Servicios TI'),
	('switches_enterprise','Switches Enterprise','Servicios TI'),
	('vpn_enterprise','VPN Enterprise','Servicios TI'),
	('seguridad_red','Seguridad de Red','Servicios TI'),
	('monitoreo_red','Monitoreo de Red','Servicios TI'),
	('backup_enterprise','Backup Enterprise','Servicios TI'),
	('voip_enterprise','VoIP Enterprise','Servicios TI'),
	('mantenimiento_sistemas','Mantenimiento de Sistemas','Servicios TI'),
	('consultoria_it','Consultoría IT','Servicios TI'),
	('soporte_tecnico','Soporte Técnico','Servicios TI')
)
select c.*
from catalog c
left join public.rt_pricing_library p
	on p.service_id = c.service_id
	and lower(trim(coalesce(p.country, ''))) = 'chile'
	and p.app_id = (select target_app_id from params)
	and p.is_active = true
	and coalesce(p.base_price, 0) > 0
where p.id is null
order by c.category_name, c.service_name;

-- B) Servicios con categoría distinta a la esperada en catálogo
with params as (
	select 'f6afc182-3e8e-43a8-810d-d47509e7c8e1'::uuid as target_app_id
),
catalog(service_id, category_name) as (
	values
	('desarrollo_pagina_web','Desarrollo Web'),
	('desarrollo_landing_page','Desarrollo Web'),
	('desarrollo_sitio_corporativo','Desarrollo Web'),
	('desarrollo_ecommerce','Desarrollo Web'),
	('desarrollo_cms_wordpress','Desarrollo Web'),
	('desarrollo_portal_web','Desarrollo Web'),
	('desarrollo_cms_personalizado','Desarrollo Web'),
	('desarrollo_app_movil_ios','Desarrollo Móvil'),
	('desarrollo_app_movil_android','Desarrollo Móvil'),
	('desarrollo_app_hibrida','Desarrollo Móvil'),
	('desarrollo_app_react_native','Desarrollo Móvil'),
	('desarrollo_app_flutter','Desarrollo Móvil'),
	('desarrollo_app_web_progressive','Desarrollo Móvil'),
	('desarrollo_api_rest','Desarrollo Backend'),
	('desarrollo_api_graphql','Desarrollo Backend'),
	('desarrollo_microservicios','Desarrollo Backend'),
	('desarrollo_backend_nodejs','Desarrollo Backend'),
	('desarrollo_backend_python','Desarrollo Backend'),
	('desarrollo_backend_java','Desarrollo Backend'),
	('desarrollo_backend_php','Desarrollo Backend'),
	('desarrollo_frontend_react','Desarrollo Frontend'),
	('desarrollo_frontend_vue','Desarrollo Frontend'),
	('desarrollo_frontend_angular','Desarrollo Frontend'),
	('diseño_ui_ux','Desarrollo Frontend'),
	('diseño_prototipo','Desarrollo Frontend'),
	('diseño_sistema_design','Desarrollo Frontend'),
	('diseño_logo_branding','Desarrollo Frontend'),
	('integracion_api_terceros','Integración y Automatización'),
	('integracion_payment_gateway','Integración y Automatización'),
	('integracion_crm','Integración y Automatización'),
	('integracion_erp','Integración y Automatización'),
	('automatizacion_procesos','Integración y Automatización'),
	('desarrollo_bot_chat','Integración y Automatización'),
	('integracion_webhook','Integración y Automatización'),
	('testing_unitario','Testing y Calidad'),
	('testing_integracion','Testing y Calidad'),
	('testing_automation','Testing y Calidad'),
	('testing_seguridad','Testing y Calidad'),
	('testing_performance','Testing y Calidad'),
	('testing_usabilidad','Testing y Calidad'),
	('configuracion_ci_cd','DevOps y Deployment'),
	('configuracion_docker','DevOps y Deployment'),
	('configuracion_kubernetes','DevOps y Deployment'),
	('configuracion_jenkins','DevOps y Deployment'),
	('deployment_produccion','DevOps y Deployment'),
	('monitoreo_aplicacion','DevOps y Deployment'),
	('desarrollo_erp_personalizado','Soluciones Empresariales'),
	('desarrollo_crm_personalizado','Soluciones Empresariales'),
	('desarrollo_sistema_inventario','Soluciones Empresariales'),
	('desarrollo_sistema_facturacion','Soluciones Empresariales'),
	('desarrollo_sistema_contabilidad','Soluciones Empresariales'),
	('desarrollo_sistema_rrhh','Soluciones Empresariales'),
	('desarrollo_ia_machine_learning','Desarrollo Especializado'),
	('desarrollo_blockchain','Desarrollo Especializado'),
	('desarrollo_iot','Desarrollo Especializado'),
	('desarrollo_realidad_aumentada','Desarrollo Especializado'),
	('desarrollo_chatbot_ai','Desarrollo Especializado'),
	('desarrollo_sistema_recomendacion','Desarrollo Especializado'),
	('consultoria_arquitectura','Consultoría y Planificación'),
	('consultoria_tecnologia','Consultoría y Planificación'),
	('planificacion_proyecto','Consultoría y Planificación'),
	('analisis_requerimientos','Consultoría y Planificación'),
	('documentacion_tecnica','Consultoría y Planificación'),
	('capacitacion_usuarios','Consultoría y Planificación'),
	('instalacion_redes','Servicios TI'),
	('cableado_estructurado','Servicios TI'),
	('wifi_enterprise','Servicios TI'),
	('switches_enterprise','Servicios TI'),
	('vpn_enterprise','Servicios TI'),
	('seguridad_red','Servicios TI'),
	('monitoreo_red','Servicios TI'),
	('backup_enterprise','Servicios TI'),
	('voip_enterprise','Servicios TI'),
	('mantenimiento_sistemas','Servicios TI'),
	('consultoria_it','Servicios TI'),
	('soporte_tecnico','Servicios TI')
)
select
	p.service_id,
	p.service_name,
	p.category as db_category,
	c.category_name as expected_category,
	p.country,
	p.app_id
from public.rt_pricing_library p
join catalog c on c.service_id = p.service_id
where lower(trim(coalesce(p.country, ''))) = 'chile'
	and p.app_id = (select target_app_id from params)
	and p.is_active = true
	and coalesce(p.category, '') <> c.category_name
order by p.service_id;

-- C) Duplicados por service_id + country + app_id (activos)
select
	service_id,
	country,
	app_id,
	count(*) as qty
from public.rt_pricing_library
where is_active = true
group by service_id, country, app_id
having count(*) > 1
order by qty desc, service_id;
