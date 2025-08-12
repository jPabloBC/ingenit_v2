export interface Country {
    code: string;
    name: string;
    flag: string;
    regions: Region[];
}

export interface Region {
    id: string;
    name: string;
    communes: string[];
}

export const GEO_DATA: Country[] = [
    {
        code: "CL",
        name: "Chile",
        flag: "🇨🇱",
        regions: [
            {
                id: "arica",
                name: "Arica y Parinacota",
                communes: ["Arica", "Camarones", "Putre", "General Lagos"]
            },
            {
                id: "tarapaca",
                name: "Tarapacá",
                communes: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"]
            },
            {
                id: "antofagasta",
                name: "Antofagasta",
                communes: ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"]
            },
            {
                id: "atacama",
                name: "Atacama",
                communes: ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"]
            },
            {
                id: "coquimbo",
                name: "Coquimbo",
                communes: ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paiguano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"]
            },
            {
                id: "valparaiso",
                name: "Valparaíso",
                communes: ["Valparaíso", "Viña del Mar", "Concón", "Quintero", "Puchuncaví", "Casablanca", "Juan Fernández", "San Antonio", "Cartagena", "El Tabo", "El Quisco", "Algarrobo", "Santo Domingo", "Isla de Pascua", "Los Andes", "San Esteban", "Catemu", "Panquehue", "Llaillay", "San Felipe", "Putaendo", "Santa María", "Quillota", "La Cruz", "La Calera", "Nogales", "Hijuelas", "Olmué", "Limache", "Villa Alemana", "Quilpué", "Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "Pichilemu", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "San Fernando", "Chépica", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Pumanque", "Santa Cruz"]
            },
            {
                id: "ohiggins",
                name: "O'Higgins",
                communes: ["Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "Pichilemu", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "San Fernando", "Chépica", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Pumanque", "Santa Cruz"]
            },
            {
                id: "maule",
                name: "Maule",
                communes: ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael", "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas"]
            },
            {
                id: "biobio",
                name: "Biobío",
                communes: ["Chillán", "Bulnes", "Cobquecura", "Coelemu", "Coihueco", "Chillán Viejo", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay", "Concepción", "Coronel", "Chiguayante", "Florida", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé", "Hualpén", "Lebu", "Arauco", "Cañete", "Contulmo", "Curanilahue", "Los Álamos", "Tirúa", "Los Ángeles", "Antuco", "Cabrero", "Laja", "Mulchén", "Nacimiento", "Negrete", "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel", "Yumbel", "Alto Biobío"]
            },
            {
                id: "araucania",
                name: "La Araucanía",
                communes: ["Temuco", "Carahue", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica", "Cholchol", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco", "Purén", "Renaico", "Traiguén", "Victoria"]
            },
            {
                id: "rios",
                name: "Los Ríos",
                communes: ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"]
            },
            {
                id: "lagos",
                name: "Los Lagos",
                communes: ["Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas", "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao", "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Chaitén", "Futaleufú", "Hualaihué", "Palena"]
            },
            {
                id: "aysen",
                name: "Aysén",
                communes: ["Coyhaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Cochrane", "O'Higgins", "Tortel", "Chile Chico", "Río Ibáñez"]
            },
            {
                id: "magallanes",
                name: "Magallanes",
                communes: ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine"]
            },
            {
                id: "metropolitana",
                name: "Región Metropolitana",
                communes: ["Santiago", "Providencia", "Las Condes", "Ñuñoa", "Maipú", "Puente Alto", "La Florida", "San Miguel", "La Granja", "La Pintana", "El Bosque", "Pedro Aguirre Cerda", "Lo Espejo", "Estación Central", "Cerrillos", "Independencia", "Recoleta", "Huechuraba", "Conchalí", "Quilicura", "Colina", "Lampa", "Tiltil", "San Bernardo", "Buin", "Paine", "Melipilla", "Talagante", "El Monte", "Isla de Maipo", "Peñaflor", "Padre Hurtado", "Pirque", "San José de Maipo"]
            },
            {
                id: "nuble",
                name: "Ñuble",
                communes: ["Chillán", "Bulnes", "Cobquecura", "Coelemu", "Coihueco", "Chillán Viejo", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"]
            }
        ]
    },
    {
        code: "AR",
        name: "Argentina",
        flag: "🇦🇷",
        regions: [
            {
                id: "buenos_aires",
                name: "Buenos Aires",
                communes: ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "San Nicolás", "Quilmes", "Avellaneda", "Lanús", "General San Martín", "Moreno", "Merlo", "Florencio Varela", "San Isidro", "Tigre", "Malvinas Argentinas", "Vicente López", "San Fernando", "San Miguel", "José C. Paz", "Pilar", "Escobar", "Tres de Febrero", "Morón", "Ituzaingó", "Hurlingham", "San Martín", "La Matanza", "Ezeiza", "Esteban Echeverría", "Almirante Brown", "Berazategui", "Florencio Varela", "Quilmes", "Avellaneda", "Lanús", "Lomas de Zamora", "La Matanza", "San Martín", "Vicente López", "San Isidro", "San Fernando", "Tigre", "San Miguel", "José C. Paz", "Malvinas Argentinas", "Pilar", "Escobar", "Tres de Febrero", "Morón", "Ituzaingó", "Hurlingham", "Moreno", "Merlo", "General San Martín", "La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "San Nicolás", "Quilmes", "Avellaneda", "Lanús", "General San Martín", "Moreno", "Merlo", "Florencio Varela", "San Isidro", "Tigre", "Malvinas Argentinas", "Vicente López", "San Fernando", "San Miguel", "José C. Paz", "Pilar", "Escobar", "Tres de Febrero", "Morón", "Ituzaingó", "Hurlingham", "San Martín", "La Matanza", "Ezeiza", "Esteban Echeverría", "Almirante Brown", "Berazategui", "Florencio Varela", "Quilmes", "Avellaneda", "Lanús", "Lomas de Zamora", "La Matanza", "San Martín", "Vicente López", "San Isidro", "San Fernando", "Tigre", "San Miguel", "José C. Paz", "Malvinas Argentinas", "Pilar", "Escobar", "Tres de Febrero", "Morón", "Ituzaingó", "Hurlingham", "Moreno", "Merlo", "General San Martín"]
            },
            {
                id: "cordoba",
                name: "Córdoba",
                communes: ["Córdoba", "Villa María", "Río Cuarto", "San Francisco", "Villa Carlos Paz", "Alta Gracia", "Bell Ville", "Villa Dolores", "Río Tercero", "La Falda", "Cosquín", "Villa Allende", "Jesús María", "Villa del Rosario", "Oncativo", "Villa Nueva", "Cruz del Eje", "Deán Funes", "Villa de María", "Villa Cura Brochero", "Villa General Belgrano", "Villa Rumipal", "Villa del Totoral", "Villa del Prado", "Villa del Dique", "Villa del Rosario", "Villa del Tránsito", "Villa del Prado", "Villa del Dique", "Villa del Rosario", "Villa del Tránsito"]
            },
            {
                id: "santa_fe",
                name: "Santa Fe",
                communes: ["Rosario", "Santa Fe", "Villa Gobernador Gálvez", "San Lorenzo", "Venado Tuerto", "Rafaela", "Reconquista", "Sunchales", "San Jorge", "Firmat", "Casilda", "Pérez", "Funes", "Roldán", "San José del Rincón", "San Jerónimo del Sauce", "San Jerónimo Norte", "San Jerónimo Sud", "San Martín de las Escobas", "San Martín Norte", "San Martín Sur", "San Vicente", "Santo Domingo", "Santo Tomé", "Sunchales", "Tacuarendí", "Tacural", "Tartagal", "Teodelina", "Timbúes", "Tostado", "Totoras", "Villa Ana", "Villa Cañás", "Villa Constitución", "Villa Eloísa", "Villa Guillermina", "Villa Minetti", "Villa Mugueta", "Villa Ocampo", "Villa San José", "Villa Trinidad", "Wheelwright", "Zavalla"]
            }
        ]
    },
    {
        code: "CO",
        name: "Colombia",
        flag: "🇨🇴",
        regions: [
            {
                id: "bogota",
                name: "Bogotá D.C.",
                communes: ["Usaquén", "Chapinero", "Santa Fe", "San Cristóbal", "Usme", "Tunjuelito", "Bosa", "Kennedy", "Fontibón", "Engativá", "Suba", "Barrios Unidos", "Teusaquillo", "Los Mártires", "Antonio Nariño", "Puente Aranda", "La Candelaria", "Rafael Uribe Uribe", "Ciudad Bolívar", "Sumapaz"]
            },
            {
                id: "antioquia",
                name: "Antioquia",
                communes: ["Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "La Estrella", "Caldas", "Copacabana", "Girardota", "Barbosa", "Guarne", "Guatapé", "El Peñol", "San Vicente", "Marinilla", "Rionegro", "Carmen de Viboral", "El Retiro", "La Ceja", "La Unión", "San Carlos", "San Rafael", "San Roque", "Santo Domingo", "Amalfi", "Anorí", "Cisneros", "Remedios", "San José de la Montaña", "Segovia", "Vegachí", "Yalí", "Yolombó", "Angostura", "Belmira", "Carolina del Príncipe", "Donmatías", "Entrerríos", "Gómez Plata", "Guadalupe", "Ituango", "San Andrés de Cuerquia", "San José de la Montaña", "San Pedro de los Milagros", "Santa Rosa de Osos", "Toledo", "Valdivia", "Yarumal", "Abriaquí", "Anzá", "Armenia", "Buriticá", "Caicedo", "Cañasgordas", "Dabeiba", "Ebéjico", "Frontino", "Giraldo", "Heliconia", "Liborina", "Olaya", "Peque", "Sabanalarga", "San Jerónimo", "Sopetrán", "Uramita", "Venecia", "Yarumal", "Abriaquí", "Anzá", "Armenia", "Buriticá", "Caicedo", "Cañasgordas", "Dabeiba", "Ebéjico", "Frontino", "Giraldo", "Heliconia", "Liborina", "Olaya", "Peque", "Sabanalarga", "San Jerónimo", "Sopetrán", "Uramita", "Venecia"]
            },
            {
                id: "valle",
                name: "Valle del Cauca",
                communes: ["Cali", "Buenaventura", "Palmira", "Tuluá", "Buga", "Cartago", "Jamundí", "Yumbo", "Florida", "Pradera", "Candelaria", "Vijes", "Yotoco", "Riofrío", "Trujillo", "Bolívar", "Caucasia", "El Cerrito", "Ginebra", "Guacarí", "La Cumbre", "La Unión", "Obando", "Restrepo", "Roldanillo", "San Pedro", "Sevilla", "Toro", "Ulloa", "Versalles", "Zarzal", "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura", "Buga", "Bugalagrande", "Caicedonia", "Cali", "Calima", "Candelaria", "Cartago", "Dagua", "El Águila", "El Cairo", "El Cerrito", "El Dovio", "Florida", "Ginebra", "Guacarí", "Jamundí", "La Cumbre", "La Unión", "La Victoria", "Obando", "Palmira", "Pradera", "Restrepo", "Riofrío", "Roldanillo", "San Pedro", "Sevilla", "Toro", "Trujillo", "Tuluá", "Ulloa", "Versalles", "Vijes", "Yotoco", "Yumbo", "Zarzal"]
            }
        ]
    },
    {
        code: "MX",
        name: "México",
        flag: "🇲🇽",
        regions: [
            {
                id: "cdmx",
                name: "Ciudad de México",
                communes: ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa de Morelos", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "La Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"]
            },
            {
                id: "jalisco",
                name: "Jalisco",
                communes: ["Guadalajara", "Zapopan", "San Pedro Tlaquepaque", "Tlaquepaque", "Tonalá", "El Salto", "Tlajomulco de Zúñiga", "Puerto Vallarta", "Lagos de Moreno", "El Grullo", "Autlán de Navarro", "Casimiro Castillo", "Cihuatlán", "Cuautitlán de García Barragán", "Cuquío", "Chapala", "Chimaltitán", "Chiquilistlán", "Degollado", "Ejutla", "Encarnación de Díaz", "Etzatlán", "Gómez Farías", "Guachinango", "Guadalajara", "Hostotipaquillo", "Huejúcar", "Huejuquilla el Alto", "Ixtlahuacán de los Membrillos", "Ixtlahuacán del Río", "Jalostotitlán", "Jamay", "Jesús María", "Jilotlán de los Dolores", "Jocotepec", "Juanacatlán", "Juchitlán", "Lagos de Moreno", "El Limón", "Magdalena", "Santa María del Oro", "La Manzanilla de la Paz", "Mascota", "Mazamitla", "Mexticacán", "Mezquitic", "Mixtlán", "Ocotlán", "Ojuelos de Jalisco", "Pihuamo", "Poncitlán", "Puerto Vallarta", "Quitupan", "El Salto", "San Cristóbal de la Barranca", "San Diego de Alejandría", "San Juan de los Lagos", "San Julián", "San Marcos", "San Martín de Bolaños", "San Martín Hidalgo", "San Miguel el Alto", "Gómez Farías", "San Sebastián del Oeste", "Santa María de los Ángeles", "Sayula", "Tala", "Talpa de Allende", "Tamazula de Gordiano", "Tapalpa", "Tecalitlán", "Tecolotlán", "Techaluta de Montenegro", "Tenamaxtlán", "Teocaltiche", "Teocuitatlán de Corona", "Tepatitlán de Morelos", "Tequila", "Teuchitlán", "Tizapán el Alto", "Tlajomulco de Zúñiga", "San Pedro Tlaquepaque", "Tolimán", "Tomatlán", "Tonalá", "Tonaya", "Tonila", "Totatiche", "Tototlán", "Tuxcacuesco", "Tuxcueca", "Tuxpan", "Unión de San Antonio", "Unión de Tula", "Valle de Guadalupe", "Valle de Juárez", "San Gabriel", "Villa Corona", "Villa Guerrero", "Villa Hidalgo", "Cañadas de Obregón", "Yahualica de González Gallo", "Zacoalco de Torres", "Zapopan", "Zapotiltic", "Zapotitlán de Vadillo", "Zapotlán del Rey", "Zapotlán el Grande", "Zapotlanejo", "San Ignacio Cerro Gordo"]
            }
        ]
    },
    {
        code: "PE",
        name: "Perú",
        flag: "🇵🇪",
        regions: [
            {
                id: "lima",
                name: "Lima",
                communes: ["Lima", "Callao", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Iquitos", "Chimbote", "Cusco", "Pucallpa", "Tacna", "Ica", "Juliaca", "Cajamarca", "Puno", "Tarapoto", "Huancayo", "Ayacucho", "Chincha Alta", "Huánuco", "Huacho", "Sullana", "Tumbes", "Talara", "Chachapoyas", "Huaraz", "Pisco", "Catacaos", "Paita", "Tacna", "Moquegua", "Ilo", "Tacna", "Moquegua", "Ilo", "Tacna", "Moquegua", "Ilo"]
            },
            {
                id: "arequipa",
                name: "Arequipa",
                communes: ["Arequipa", "Camaná", "Islay", "La Unión", "Castilla", "Condesuyos", "Caravelí", "Caylloma", "Camaná", "Islay", "La Unión", "Castilla", "Condesuyos", "Caravelí", "Caylloma"]
            }
        ]
    },
    {
        code: "EC",
        name: "Ecuador",
        flag: "🇪🇨",
        regions: [
            {
                id: "pichincha",
                name: "Pichincha",
                communes: ["Quito", "Cayambe", "Mejía", "Pedro Moncayo", "Rumiñahui", "San Miguel de los Bancos", "Pedro Vicente Maldonado", "Puerto Quito"]
            },
            {
                id: "guayas",
                name: "Guayas",
                communes: ["Guayaquil", "Daule", "Samborondón", "Durán", "El Triunfo", "Milagro", "Naranjal", "Nobol", "Palestina", "Pedro Carbo", "Salitre", "Santa Lucía", "Simón Bolívar", "Yaguachi"]
            }
        ]
    },
    {
        code: "VE",
        name: "Venezuela",
        flag: "🇻🇪",
        regions: [
            {
                id: "distrito_capital",
                name: "Distrito Capital",
                communes: ["Libertador", "Sucre", "El Hatillo", "Baruta", "Chacao", "Petare", "San Antonio de los Altos", "Los Teques", "Guarenas", "Guatire"]
            },
            {
                id: "miranda",
                name: "Miranda",
                communes: ["Acevedo", "Andrés Bello", "Baruta", "Brión", "Buroz", "Carrizal", "Chacao", "Cristóbal Rojas", "El Hatillo", "Guaicaipuro", "Independencia", "Lander", "Los Salias", "Páez", "Paz Castillo", "Pedro Gual", "Plaza", "Simón Bolívar", "Sucre", "Urdaneta", "Zamora"]
            }
        ]
    },
    {
        code: "PY",
        name: "Paraguay",
        flag: "🇵🇾",
        regions: [
            {
                id: "central",
                name: "Central",
                communes: ["Asunción", "San Lorenzo", "Luque", "Capiatá", "Lambaré", "Fernando de la Mora", "Limpio", "Ñemby", "San Antonio", "Itauguá", "Mariano Roque Alonso", "Itá", "Villa Elisa", "San Bernardino", "Areguá", "Ypacaraí", "Guarambaré", "Villeta", "J. Augusto Saldívar", "Tobatí", "Atyrá", "Altos", "Arroyos y Esteros", "Emboscada", "Eusebio Ayala", "Isla Pucú", "Itacurubí de la Cordillera", "Juan de Mena", "Loma Grande", "Mbocayaty del Yhaguy", "Nueva Colombia", "Piribebuy", "Primero de Marzo", "San José Obrero", "San Patricio", "Santa Rosa del Mbuyapey", "Tobatí", "Valenzuela", "Ybycuí", "Ybytymí"]
            },
            {
                id: "alto_parana",
                name: "Alto Paraná",
                communes: ["Ciudad del Este", "Hernandarias", "Mingguazú", "Itakyry", "Juan León Mallorquín", "Naranjal", "Ñacunday", "Presidente Franco", "San Alberto", "San Cristóbal", "Santa Fe del Paraná", "Yguazú", "Dr. Raúl Peña", "Los Cedrales", "Mbaracayú", "Minga Porá", "Nueva Esperanza", "Salto del Guairá", "Tacuaras", "Ypehú"]
            }
        ]
    },
    {
        code: "UY",
        name: "Uruguay",
        flag: "🇺🇾",
        regions: [
            {
                id: "montevideo",
                name: "Montevideo",
                communes: ["Centro", "Cordón", "Punta Carretas", "Pocitos", "Buceo", "Malvín", "Maroñas", "Parque Rodó", "Punta Gorda", "Villa Biarritz", "Carrasco", "Punta Poquitos", "Villa Dolores", "Villa Española", "Ituzaingó", "Piedras Blancas", "Manga", "Toledo Chico", "Villa del Cerro", "Casabó", "Flor de Maroñas", "Piedras Blancas", "Manga", "Toledo Chico", "Villa del Cerro", "Casabó", "Flor de Maroñas"]
            },
            {
                id: "canelones",
                name: "Canelones",
                communes: ["Canelones", "Santa Lucía", "Las Piedras", "Pando", "Progreso", "La Paz", "San Ramón", "San Jacinto", "Tala", "Aguas Corrientes", "Santa Rosa", "San Bautista", "San Antonio", "Atlántida", "Parque del Plata", "Costa Azul", "Salinas", "Piriápolis", "Pan de Azúcar", "Piriápolis", "La Floresta", "Neptunia", "El Pinar", "Solymar", "El Bosque", "Lomas de Solymar", "Barra de Carrasco", "Colonia Nicolich", "Paso Carrasco", "Paso de la Arena", "Villa García", "Manga", "Toledo Chico", "Villa del Cerro", "Casabó", "Flor de Maroñas"]
            }
        ]
    },
    {
        code: "BO",
        name: "Bolivia",
        flag: "🇧🇴",
        regions: [
            {
                id: "la_paz",
                name: "La Paz",
                communes: ["La Paz", "El Alto", "Viacha", "Achocalla", "Mecapaca", "Palca", "Luribay", "Coroico", "Guanay", "Quime", "Cajuata", "Inquisivi", "Villa Libertad", "Sicasica", "Aroma", "Patacamaya", "Calamarca", "Colquencha", "Machacamarca", "Comanche", "Waldo Ballivián", "Nazacara de Pacajes", "Caquiaviri", "Colquencha", "Machacamarca", "Comanche", "Waldo Ballivián", "Nazacara de Pacajes", "Caquiaviri"]
            },
            {
                id: "santa_cruz",
                name: "Santa Cruz",
                communes: ["Santa Cruz de la Sierra", "Montero", "Warnes", "Cotoca", "Porongo", "La Guardia", "El Torno", "San Ignacio", "San José de Chiquitos", "Roboré", "Pailón", "San Julián", "Concepción", "San Javier", "San Ramón", "San Miguel", "San Rafael", "Buena Vista", "San Carlos", "Yapacaní", "San Juan", "San Pedro", "Puerto Suárez", "Puerto Quijarro", "Carmen Rivero Torrez", "Boyuibe", "Cabezas", "Cuevo", "Gutiérrez", "Lagunillas", "Camiri", "Charagua", "San Antonio del Parapetí", "Cabezas", "Cuevo", "Gutiérrez", "Lagunillas", "Camiri", "Charagua", "San Antonio del Parapetí"]
            }
        ]
    },
    {
        code: "BR",
        name: "Brasil",
        flag: "🇧🇷",
        regions: [
            {
                id: "sao_paulo",
                name: "São Paulo",
                communes: ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "Osasco", "Ribeirão Preto", "Sorocaba", "Mauá", "São José dos Campos", "Santos", "Mogi das Cruzes", "Diadema", "Jundiaí", "Piracicaba", "Carapicuíba", "Bauru", "Itaquaquecetuba", "São Vicente", "Franca", "Praia Grande", "Limeira", "Guarujá", "Taubaté", "Taboão da Serra", "Sumaré", "Barueri", "Embu das Artes", "Indaiatuba", "Cotia", "Americana", "Araraquara", "Itapevi", "Marília", "Itapetininga", "Botucatu", "Bragança Paulista", "Jaú", "Assis", "Ribeirão Pires", "Catanduva", "Mogi Guaçu", "Pindamonhangaba", "Jaboticabal", "Lins", "Votuporanga", "Itu", "Salto", "Tupã", "Avaré", "Ourinhos", "Santa Bárbara d'Oeste", "Hortolândia", "Sertãozinho", "Tatuí", "Várzea Paulista", "Valinhos", "Jandira", "Birigui", "Caraguatatuba", "Itatiba", "Ferraz de Vasconcelos", "Nova Odessa", "Caieiras", "Mairiporã", "Leme", "Pirassununga", "Vinhedo", "Lençóis Paulista", "Bebedouro", "Rio Claro", "Votorantim", "Jaboticabal", "Lins", "Votuporanga", "Itu", "Salto", "Tupã", "Avaré", "Ourinhos", "Santa Bárbara d'Oeste", "Hortolândia", "Sertãozinho", "Tatuí", "Várzea Paulista", "Valinhos", "Jandira", "Birigui", "Caraguatatuba", "Itatiba", "Ferraz de Vasconcelos", "Nova Odessa", "Caieiras", "Mairiporã", "Leme", "Pirassununga", "Vinhedo", "Lençóis Paulista", "Bebedouro", "Rio Claro", "Votorantim"]
            },
            {
                id: "rio_de_janeiro",
                name: "Rio de Janeiro",
                communes: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Belford Roxo", "São João de Meriti", "Campos dos Goytacazes", "Petrópolis", "Volta Redonda", "Magé", "Itaboraí", "Nova Friburgo", "Barra Mansa", "Teresópolis", "Mesquita", "Angra dos Reis", "Queimados", "Itaguaí", "São Pedro da Aldeia", "Armação dos Búzios", "Cabo Frio", "Arraial do Cabo", "Iguaba Grande", "São José do Vale do Rio Preto", "Tanguá", "Guapimirim", "Cachoeiras de Macacu", "Rio Bonito", "Itatiaia", "Resende", "Barra do Piraí", "Três Rios", "Paraíba do Sul", "Valença", "Vassouras", "Petrópolis", "Teresópolis", "Nova Friburgo", "Bom Jardim", "Cantagalo", "Carmo", "Cordeiro", "Duas Barras", "Macuco", "Santa Maria Madalena", "São Sebastião do Alto", "Sumidouro", "Trajano de Moraes", "Varre-Sai", "Bom Jesus do Itabapoana", "Itaperuna", "Laje do Muriaé", "Natividade", "Porciúncula", "Santo Antônio de Pádua", "São José de Ubá", "Cambuci", "Itaocara", "Miracema", "Santo Antônio de Pádua", "São Fidélis", "São João da Barra", "Campos dos Goytacazes", "Cardoso Moreira", "Carapebus", "Conceição de Macabu", "Macaé", "Quissamã", "São Francisco de Itabapoana", "São João da Barra", "Armação dos Búzios", "Arraial do Cabo", "Cabo Frio", "Iguaba Grande", "São Pedro da Aldeia", "Saquarema", "Araruama", "Casimiro de Abreu", "Rio das Ostras", "Silva Jardim", "Barra de São João", "São Pedro da Aldeia", "Armação dos Búzios", "Arraial do Cabo", "Cabo Frio", "Iguaba Grande", "São Pedro da Aldeia", "Saquarema", "Araruama", "Casimiro de Abreu", "Rio das Ostras", "Silva Jardim", "Barra de São João"]
            }
        ]
    },
    {
        code: "ES",
        name: "España",
        flag: "🇪🇸",
        regions: [
            {
                id: "madrid",
                name: "Madrid",
                communes: ["Madrid", "Móstoles", "Alcalá de Henares", "Fuenlabrada", "Leganés", "Getafe", "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas", "Las Rozas de Madrid", "San Sebastián de los Reyes", "Pozuelo de Alarcón", "Rivas-Vaciamadrid", "Coslada", "Valdemoro", "Majadahonda", "Collado Villalba", "Arganda del Rey", "Boadilla del Monte", "Pinto", "Colmenar Viejo", "San Fernando de Henares", "Tres Cantos", "Galapagar", "Torrelodones", "Villaviciosa de Odón", "Navalcarnero", "Aranjuez", "Ciempozuelos", "Valdemorillo", "Villanueva de la Cañada", "Villanueva del Pardillo", "Brunete", "Griñón", "Moraleja de Enmedio", "Serranillos del Valle", "Batres", "Becerril de la Sierra", "El Boalo", "Braojos", "Brea de Tajo", "Brunete", "Buitrago del Lozoya", "Bustarviejo", "Cabanillas de la Sierra", "La Cabrera", "Cadalso de los Vidrios", "Camarma de Esteruelas", "Campo Real", "Canencia", "Carabaña", "Casarrubuelos", "Cenicientos", "Cercedilla", "Cervera de Buitrago", "Ciempozuelos", "Cobeña", "Collado Mediano", "Colmenar del Arroyo", "Colmenar Viejo", "Colmenarejo", "Corpa", "Coslada", "Cubas de la Sagra", "Chapinería", "Chinchón", "Daganzo de Arriba", "El Escorial", "Estremera", "Fresnedillas de la Oliva", "Fresno de Torote", "Fuenlabrada", "Fuente el Saz de Jarama", "Fuentidueña de Tajo", "Galapagar", "Garganta de los Montes", "Gargantilla del Lozoya y Pinilla de Buitrago", "Gascones", "Getafe", "Griñón", "Guadalix de la Sierra", "Guadarrama", "La Hiruela", "Horcajo de la Sierra-Aoslos", "Horcajuelo de la Sierra", "Hoyo de Manzanares", "Humanes de Madrid", "Leganés", "Loeches", "Lozoya", "Lozoyuela-Navas-Sieteiglesias", "Madarcos", "Madrid", "Majadahonda", "Manzanares el Real", "Meco", "Mejorada del Campo", "Miraflores de la Sierra", "El Molar", "Los Molinos", "Montejo de la Sierra", "Moraleja de Enmedio", "Moralzarzal", "Morata de Tajuña", "Móstoles", "Navacerrada", "Navalafuente", "Navalagamella", "Navalcarnero", "Navarredonda y San Mamés", "Navas del Rey", "Nuevo Baztán", "Olmeda de las Fuentes", "Orusco de Tajuña", "Paracuellos de Jarama", "Parla", "Pedrezuela", "Pelayos de la Presa", "Perales de Tajuña", "Pezuela de las Torres", "Pinilla del Valle", "Pinto", "Piñuécar-Gandullas", "Pozuelo de Alarcón", "Pozuelo del Rey", "Prádena del Rincón", "Puebla de la Sierra", "Puentes Viejas", "Quijorna", "Rascafría", "Redueña", "Ribatejada", "Rivas-Vaciamadrid", "Robledillo de la Jara", "Robledo de Chavela", "Robregordo", "Las Rozas de Madrid", "Rozas de Puerto Real", "San Agustín del Guadalix", "San Fernando de Henares", "San Lorenzo de El Escorial", "San Martín de la Vega", "San Martín de Valdeiglesias", "San Sebastián de los Reyes", "Santa María de la Alameda", "Santorcaz", "Los Santos de la Humosa", "La Serna del Monte", "Serranillos del Valle", "Sevilla la Nueva", "Somosierra", "Soto del Real", "Talamanca de Jarama", "Tielmes", "Titulcia", "Torrejón de Ardoz", "Torrejón de la Calzada", "Torrejón de Velasco", "Torrelaguna", "Torrelodones", "Torremocha de Jarama", "Torres de la Alameda", "Tres Cantos", "Valdaracete", "Valdeavero", "Valdelaguna", "Valdemanco", "Valdemaqueda", "Valdemorillo", "Valdemoro", "Valdeolmos-Alalpardo", "Valdepiélagos", "Valdetorres de Jarama", "Valdilecha", "Valverde de Alcalá", "Velilla de San Antonio", "El Vellón", "Venturada", "Villa del Prado", "Villaconejos", "Villalbilla", "Villamanrique de Tajo", "Villamanta", "Villamantilla", "Villanueva de la Cañada", "Villanueva del Pardillo", "Villanueva de Perales", "Villar del Olmo", "Villarejo de Salvanés", "Villaviciosa de Odón", "Villavieja del Lozoya", "Zarzalejo"]
            },
            {
                id: "barcelona",
                name: "Barcelona",
                communes: ["Barcelona", "Hospitalet de Llobregat", "Badalona", "Terrassa", "Sabadell", "Lleida", "L'Hospitalet de Llobregat", "Girona", "Tarragona", "Reus", "Mataró", "Santa Coloma de Gramenet", "Cornellà de Llobregat", "Sant Cugat del Vallès", "Vic", "Manresa", "El Prat de Llobregat", "Rubí", "Vilanova i la Geltrú", "Viladecans", "Castelldefels", "Cerdanyola del Vallès", "Mollet del Vallès", "Gavà", "Esplugues de Llobregat", "Sant Boi de Llobregat", "Ripollet", "Sant Adrià de Besòs", "Montcada i Reixac", "Sitges", "Vilafranca del Penedès", "Blanes", "Igualada", "Valls", "Figueres", "Olot", "Granollers", "Sant Feliu de Llobregat", "Tortosa", "Manlleu", "Cerdanyola del Vallès", "Mollet del Vallès", "Gavà", "Esplugues de Llobregat", "Sant Boi de Llobregat", "Ripollet", "Sant Adrià de Besòs", "Montcada i Reixac", "Sitges", "Vilafranca del Penedès", "Blanes", "Igualada", "Valls", "Figueres", "Olot", "Granollers", "Sant Feliu de Llobregat", "Tortosa", "Manlleu", "Cerdanyola del Vallès", "Mollet del Vallès", "Gavà", "Esplugues de Llobregat", "Sant Boi de Llobregat", "Ripollet", "Sant Adrià de Besòs", "Montcada i Reixac", "Sitges", "Vilafranca del Penedès", "Blanes", "Igualada", "Valls", "Figueres", "Olot", "Granollers", "Sant Feliu de Llobregat", "Tortosa", "Manlleu"]
            }
        ]
    },
    {
        code: "US",
        name: "Estados Unidos",
        flag: "🇺🇸",
        regions: [
            {
                id: "california",
                name: "California",
                communes: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside", "Stockton", "Irvine", "Fremont", "San Bernardino", "Modesto", "Fontana", "Oxnard", "Moreno Valley", "Huntington Beach", "Glendale", "Santa Clarita", "Garden Grove", "Oceanside", "Rancho Cucamonga", "Santa Rosa", "Ontario", "Lancaster", "Elk Grove", "Corona", "Hayward", "Salinas", "Palmdale", "Sunnyvale", "Pomona", "Escondido", "Torrance", "Roseville", "Fullerton", "Concord", "Visalia", "Simi Valley", "Thousand Oaks", "Victorville", "Pasadena", "Clovis", "Vallejo", "Berkeley", "Antioch", "Richmond", "Daly City", "Tracy", "Rialto", "Carlsbad", "Fairfield", "San Mateo", "Santa Barbara", "Hesperia", "Indio", "Vacaville", "Redding", "Lakewood", "Livermore", "Costa Mesa", "Menifee", "Galt", "Merced", "Chico", "Baldwin Park", "Upland", "Turlock", "Lake Forest", "Napa", "Buena Park", "Palm Desert", "La Habra", "San Ramon", "Alameda", "Newport Beach", "Temple City", "Cupertino", "Bellflower", "La Mesa", "Monterey Park", "Tulare", "Rancho Cordova", "Rocklin", "Brea", "La Mirada", "Citrus Heights", "Poway", "Cypress", "Novato", "Cathedral City", "San Clemente", "Pacifica", "Petaluma", "San Rafael", "La Quinta", "Monrovia", "Hollister", "San Bruno", "Rohnert Park", "Brentwood", "Beverly Hills", "San Marcos", "Bell Gardens", "West Sacramento", "Auburn", "Manteca", "Temecula", "National City", "San Jacinto", "Martinez", "South San Francisco", "Carson", "San Leandro", "Palm Springs", "Davis", "Camarillo", "Folsom", "Rancho Santa Margarita", "San Ramon", "Alameda", "Newport Beach", "Temple City", "Cupertino", "Bellflower", "La Mesa", "Monterey Park", "Tulare", "Rancho Cordova", "Rocklin", "Brea", "La Mirada", "Citrus Heights", "Poway", "Cypress", "Novato", "Cathedral City", "San Clemente", "Pacifica", "Petaluma", "San Rafael", "La Quinta", "Monrovia", "Hollister", "San Bruno", "Rohnert Park", "Brentwood", "Beverly Hills", "San Marcos", "Bell Gardens", "West Sacramento", "Auburn", "Manteca", "Temecula", "National City", "San Jacinto", "Martinez", "South San Francisco", "Carson", "San Leandro", "Palm Springs", "Davis", "Camarillo", "Folsom", "Rancho Santa Margarita"]
            },
            {
                id: "new_york",
                name: "New York",
                communes: ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica", "White Plains", "Hempstead", "Troy", "Niagara Falls", "Binghamton", "Freeport", "Valley Stream", "Long Beach", "Rockville Centre", "Glen Cove", "New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica", "White Plains", "Hempstead", "Troy", "Niagara Falls", "Binghamton", "Freeport", "Valley Stream", "Long Beach", "Rockville Centre", "Glen Cove"]
            }
        ]
    }
];

export const getCountryByCode = (code: string): Country | undefined => {
    return GEO_DATA.find(country => country.code === code);
};

export const getRegionsByCountry = (countryCode: string): Region[] => {
    const country = getCountryByCode(countryCode);
    return country?.regions || [];
};

export const getCommunesByRegion = (countryCode: string, regionId: string): string[] => {
    const country = getCountryByCode(countryCode);
    const region = country?.regions.find(r => r.id === regionId);
    return region?.communes || [];
}; 