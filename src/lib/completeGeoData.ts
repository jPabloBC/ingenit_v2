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

export const COMPLETE_GEO_DATA: Country[] = [
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
                communes: ["Valparaíso", "Viña del Mar", "Concón", "Quintero", "Puchuncaví", "Casablanca", "Juan Fernández", "San Antonio", "Cartagena", "El Tabo", "El Quisco", "Algarrobo", "Santo Domingo", "Isla de Pascua", "Los Andes", "San Esteban", "Catemu", "Panquehue", "Llaillay", "San Felipe", "Putaendo", "Santa María", "Quillota", "La Cruz", "La Calera", "Nogales", "Hijuelas", "Olmué", "Limache", "Villa Alemana", "Quilpué"]
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
                communes: ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "San Nicolás", "Quilmes", "Avellaneda", "Lanús", "General San Martín", "Moreno", "Merlo", "Florencio Varela", "San Isidro", "Tigre", "Malvinas Argentinas", "Vicente López", "San Fernando", "San Miguel", "José C. Paz", "Pilar", "Escobar", "Tres de Febrero", "Morón", "Ituzaingó", "Hurlingham", "San Martín", "La Matanza", "Ezeiza", "Esteban Echeverría", "Almirante Brown", "Berazategui", "Florencio Varela", "Quilmes", "Avellaneda", "Lanús", "Lomas de Zamora", "La Matanza", "San Martín", "Vicente López", "San Isidro", "San Fernando", "Tigre", "San Miguel", "José C. Paz", "Malvinas Argentinas", "Pilar", "Escobar", "Tres de Febrero", "Morón", "Ituzaingó", "Hurlingham", "Moreno", "Merlo", "General San Martín"]
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
            },
            {
                id: "mendoza",
                name: "Mendoza",
                communes: ["Mendoza", "San Rafael", "San Martín", "Tunuyán", "Tupungato", "Luján de Cuyo", "Maipú", "Guaymallén", "Godoy Cruz", "Las Heras", "Lavalle", "San Carlos", "Rivadavia", "Junín", "Santa Rosa", "La Paz", "San Vicente", "Malargüe", "General Alvear", "San Rafael", "San Martín", "Tunuyán", "Tupungato", "Luján de Cuyo", "Maipú", "Guaymallén", "Godoy Cruz", "Las Heras", "Lavalle", "San Carlos", "Rivadavia", "Junín", "Santa Rosa", "La Paz", "San Vicente", "Malargüe", "General Alvear"]
            },
            {
                id: "tucuman",
                name: "Tucumán",
                communes: ["San Miguel de Tucumán", "Yerba Buena", "Tafí Viejo", "Banda del Río Salí", "Aguilares", "Concepción", "Monteros", "Famaillá", "Lules", "Tafí del Valle", "Amaicha del Valle", "Colalao del Valle", "El Siambón", "San Pedro de Colalao", "Trancas", "Burruyacú", "Benjamín Aráoz", "General Belgrano", "Leales", "Famaillá", "Monteros", "Simoca", "La Cocha", "Graneros", "Lamadrid", "Chicligasta", "Juan Bautista Alberdi", "La Cocha", "Graneros", "Lamadrid", "Chicligasta", "Juan Bautista Alberdi"]
            },
            {
                id: "entre_rios",
                name: "Entre Ríos",
                communes: ["Paraná", "Concordia", "Gualeguaychú", "Gualeguay", "Concepción del Uruguay", "Victoria", "Villaguay", "Federación", "Colón", "San José de Feliciano", "La Paz", "Federal", "Feliciano", "Federación", "Colón", "San José de Feliciano", "La Paz", "Federal", "Feliciano"]
            },
            {
                id: "salta",
                name: "Salta",
                communes: ["Salta", "San Ramón de la Nueva Orán", "Tartagal", "General Güemes", "Metán", "Rosario de la Frontera", "Cafayate", "Cerrillos", "La Viña", "San Carlos", "Angastaco", "Animaná", "Cachi", "Payogasta", "Molinos", "Seclantás", "La Poma", "San Antonio de los Cobres", "Tolar Grande", "Santa Victoria", "Iruya", "La Caldera", "Cerrillos", "La Viña", "San Carlos", "Angastaco", "Animaná", "Cachi", "Payogasta", "Molinos", "Seclantás", "La Poma", "San Antonio de los Cobres", "Tolar Grande", "Santa Victoria", "Iruya", "La Caldera"]
            },
            {
                id: "misiones",
                name: "Misiones",
                communes: ["Posadas", "Oberá", "Eldorado", "Puerto Iguazú", "Apostoles", "Leandro N. Alem", "San Vicente", "Montecarlo", "Puerto Rico", "San Pedro", "El Soberbio", "San Javier", "Concepción de la Sierra", "Santa Ana", "Candelaria", "Loreto", "San Ignacio", "Santo Pipó", "Jardín América", "Bernardo de Irigoyen", "Dos de Mayo", "San Pedro", "El Soberbio", "San Javier", "Concepción de la Sierra", "Santa Ana", "Candelaria", "Loreto", "San Ignacio", "Santo Pipó", "Jardín América", "Bernardo de Irigoyen", "Dos de Mayo"]
            },
            {
                id: "chaco",
                name: "Chaco",
                communes: ["Resistencia", "Barranqueras", "Villa Ángela", "Presidencia Roque Sáenz Peña", "General José de San Martín", "Charata", "Quitilipi", "Machagai", "Villa Berthet", "Las Breñas", "Tres Isletas", "La Leonesa", "La Escondida", "Colonia Benítez", "Margarita Belén", "Puerto Tirol", "Colonia Elisa", "La Verde", "Puerto Vilelas", "Fontana", "Puerto Tirol", "Colonia Elisa", "La Verde", "Puerto Vilelas", "Fontana"]
            },
            {
                id: "corrientes",
                name: "Corrientes",
                communes: ["Corrientes", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Monte Caseros", "Mercedes", "Santo Tomé", "Sauce", "Bella Vista", "San Luis del Palmar", "Empedrado", "San Cosme", "Itatí", "San Martín", "La Cruz", "Mburucuyá", "Concepción", "San Roque", "Saladas", "Lavalle", "Santa Lucía", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Monte Caseros", "Mercedes", "Santo Tomé", "Sauce", "Bella Vista", "San Luis del Palmar", "Empedrado", "San Cosme", "Itatí", "San Martín", "La Cruz", "Mburucuyá", "Concepción", "San Roque", "Saladas", "Lavalle", "Santa Lucía"]
            },
            {
                id: "santiago_del_estero",
                name: "Santiago del Estero",
                communes: ["Santiago del Estero", "La Banda", "Termas de Río Hondo", "Añatuya", "Frías", "Villa Ojo de Agua", "Suncho Corral", "Villa Salavina", "Loreto", "Villa Atamisqui", "Villa La Punta", "Villa San Martín", "Villa Unión", "Villa Nueva", "Villa Salavina", "Loreto", "Villa Atamisqui", "Villa La Punta", "Villa San Martín", "Villa Unión", "Villa Nueva"]
            },
            {
                id: "san_juan",
                name: "San Juan",
                communes: ["San Juan", "Rawson", "Rivadavia", "Chimbas", "Santa Lucía", "Pocito", "Caucete", "Albardón", "Angaco", "San Martín", "San José de Jáchal", "Valle Fértil", "Ullum", "Zonda", "Calingasta", "Sarmiento", "Iglesia", "Calingasta", "Sarmiento", "Iglesia"]
            },
            {
                id: "jujuy",
                name: "Jujuy",
                communes: ["San Salvador de Jujuy", "Palpalá", "Perico", "Libertador General San Martín", "San Pedro", "La Quiaca", "Humahuaca", "Tilcara", "El Carmen", "San Antonio", "Maimará", "Tumbaya", "Volcán", "Tres Cruces", "Susques", "Cochinoca", "Abra Pampa", "Rinconada", "Yavi", "Santa Catalina", "La Quiaca", "Humahuaca", "Tilcara", "El Carmen", "San Antonio", "Maimará", "Tumbaya", "Volcán", "Tres Cruces", "Susques", "Cochinoca", "Abra Pampa", "Rinconada", "Yavi", "Santa Catalina"]
            },
            {
                id: "rio_negro",
                name: "Río Negro",
                communes: ["Viedma", "San Carlos de Bariloche", "General Roca", "Cipolletti", "Allen", "Cinco Saltos", "Fernández Oro", "Villa Regina", "Choele Choel", "Luis Beltrán", "Chimpay", "Lamarque", "Coronel Belisle", "Darwin", "Río Colorado", "Conesa", "San Antonio Oeste", "Sierra Grande", "Lamarque", "Chimpay", "Coronel Belisle", "Darwin", "Río Colorado", "Conesa", "San Antonio Oeste", "Sierra Grande"]
            },
            {
                id: "neuquen",
                name: "Neuquén",
                communes: ["Neuquén", "Cutral Co", "Plottier", "Centenario", "San Martín de los Andes", "Villa La Angostura", "Junín de los Andes", "Aluminé", "Zapala", "Chos Malal", "Las Lajas", "Loncopué", "Añelo", "San Patricio del Chañar", "Villa El Chocón", "Piedra del Águila", "Santo Tomás", "Picún Leufú", "Senillosa", "Villa Traful", "Villa El Chocón", "Piedra del Águila", "Santo Tomás", "Picún Leufú", "Senillosa", "Villa Traful"]
            },
            {
                id: "chubut",
                name: "Chubut",
                communes: ["Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Esquel", "Rawson", "Sarmiento", "Gaiman", "Dolavon", "28 de Julio", "Telsen", "Gastre", "Cushamen", "Languiñeo", "Mártires", "Paso de Indios", "Tecka", "José de San Martín", "Río Senguer", "Futaleufú", "Trevelin", "Lago Puelo", "El Hoyo", "Epuyén", "Cushamen", "Languiñeo", "Mártires", "Paso de Indios", "Tecka", "José de San Martín", "Río Senguer", "Futaleufú", "Trevelin", "Lago Puelo", "El Hoyo", "Epuyén"]
            },
            {
                id: "santa_cruz",
                name: "Santa Cruz",
                communes: ["Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Puerto Deseado", "Puerto San Julián", "Perito Moreno", "Los Antiguos", "Gobernador Gregores", "Río Turbio", "28 de Noviembre", "El Chaltén", "Tres Lagos", "Puerto Santa Cruz", "Comandante Luis Piedra Buena", "Puerto Deseado", "Puerto San Julián", "Perito Moreno", "Los Antiguos", "Gobernador Gregores", "Río Turbio", "28 de Noviembre", "El Chaltén", "Tres Lagos", "Puerto Santa Cruz", "Comandante Luis Piedra Buena"]
            },
            {
                id: "tierra_del_fuego",
                name: "Tierra del Fuego",
                communes: ["Ushuaia", "Río Grande", "Tolhuin", "Lago Escondido", "Tolhuin", "Lago Escondido"]
            },
            {
                id: "la_pampa",
                name: "La Pampa",
                communes: ["Santa Rosa", "General Pico", "Realicó", "Toay", "Macachín", "General Acha", "Guatraché", "Victorica", "Eduardo Castex", "Trenel", "Rancul", "Quemú Quemú", "Lonquimay", "Catrilo", "Anguil", "Atreucó", "Conhelo", "Utracán", "Chalileo", "Lihuel Calel", "Limay Mahuida", "Loventué", "Maracó", "Puelén", "Rancul", "Realicó", "Toay", "Trenel", "Utracán", "Villa Mirasol", "Winifreda", "Atreucó", "Conhelo", "Utracán", "Chalileo", "Lihuel Calel", "Limay Mahuida", "Loventué", "Maracó", "Puelén", "Rancul", "Realicó", "Toay", "Trenel", "Utracán", "Villa Mirasol", "Winifreda"]
            },
            {
                id: "la_rioja",
                name: "La Rioja",
                communes: ["La Rioja", "Chilecito", "Arauco", "Castro Barros", "Coronel Felipe Varela", "Famatina", "General Ángel V. Peñaloza", "General Belgrano", "General Juan Facundo Quiroga", "General Lamadrid", "General Ocampo", "General San Martín", "Independencia", "Rosario Vera Peñaloza", "San Blas de los Sauces", "Sanagasta", "Vinchina", "Arauco", "Castro Barros", "Coronel Felipe Varela", "Famatina", "General Ángel V. Peñaloza", "General Belgrano", "General Juan Facundo Quiroga", "General Lamadrid", "General Ocampo", "General San Martín", "Independencia", "Rosario Vera Peñaloza", "San Blas de los Sauces", "Sanagasta", "Vinchina"]
            },
            {
                id: "catamarca",
                name: "Catamarca",
                communes: ["San Fernando del Valle de Catamarca", "Valle Viejo", "Fray Mamerto Esquiú", "Capital", "Ambato", "Ancasti", "Andalgalá", "Antofagasta de la Sierra", "Belén", "Capayán", "El Alto", "La Paz", "Paclín", "Pomán", "Santa María", "Tinogasta", "Ambato", "Ancasti", "Andalgalá", "Antofagasta de la Sierra", "Belén", "Capayán", "El Alto", "La Paz", "Paclín", "Pomán", "Santa María", "Tinogasta"]
            },
            {
                id: "formosa",
                name: "Formosa",
                communes: ["Formosa", "Clorinda", "Pirané", "El Colorado", "Las Lomitas", "Comandante Fontana", "Laguna Yema", "Pozo del Tigre", "Ibarreta", "Villa General Güemes", "Misión Tacaaglé", "Palo Santo", "Villa Escolar", "Colonia Pastoril", "Laguna Blanca", "Riacho He-Hé", "Tres Lagunas", "Buena Vista", "Misión San Francisco de Laishí", "San Martín 2", "Villa 213", "Colonia Sarmiento", "Villa General Güemes", "Misión Tacaaglé", "Palo Santo", "Villa Escolar", "Colonia Pastoril", "Laguna Blanca", "Riacho He-Hé", "Tres Lagunas", "Buena Vista", "Misión San Francisco de Laishí", "San Martín 2", "Villa 213", "Colonia Sarmiento"]
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
            },
            {
                id: "cusco",
                name: "Cusco",
                communes: ["Cusco", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Quispicanchi", "Urubamba", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Quispicanchi", "Urubamba"]
            },
            {
                id: "piura",
                name: "Piura",
                communes: ["Piura", "Ayabaca", "Huancabamba", "Morropón", "Paita", "Sullana", "Talara", "Sechura", "Ayabaca", "Huancabamba", "Morropón", "Paita", "Sullana", "Talara", "Sechura"]
            },
            {
                id: "lambayeque",
                name: "Lambayeque",
                communes: ["Chiclayo", "Ferreñafe", "Lambayeque", "Chiclayo", "Ferreñafe", "Lambayeque"]
            },
            {
                id: "la_libertad",
                name: "La Libertad",
                communes: ["Trujillo", "Ascope", "Bolívar", "Chepén", "Julcán", "Otuzco", "Pacasmayo", "Pataz", "Sánchez Carrión", "Santiago de Chuco", "Gran Chimú", "Virú", "Ascope", "Bolívar", "Chepén", "Julcán", "Otuzco", "Pacasmayo", "Pataz", "Sánchez Carrión", "Santiago de Chuco", "Gran Chimú", "Virú"]
            },
            {
                id: "ancash",
                name: "Ancash",
                communes: ["Huaraz", "Aija", "Antonio Raymondi", "Asunción", "Bolognesi", "Carhuaz", "Carlos Fermín Fitzcarrald", "Casma", "Corongo", "Huari", "Huarmey", "Huaylas", "Mariscal Luzuriaga", "Ocros", "Pallasca", "Pomabamba", "Recuay", "Santa", "Sihuas", "Yungay", "Aija", "Antonio Raymondi", "Asunción", "Bolognesi", "Carhuaz", "Carlos Fermín Fitzcarrald", "Casma", "Corongo", "Huari", "Huarmey", "Huaylas", "Mariscal Luzuriaga", "Ocros", "Pallasca", "Pomabamba", "Recuay", "Santa", "Sihuas", "Yungay"]
            },
            {
                id: "junin",
                name: "Junín",
                communes: ["Huancayo", "Chanchamayo", "Chupaca", "Concepción", "Jauja", "Satipo", "Tarma", "Yauli", "Chanchamayo", "Chupaca", "Concepción", "Jauja", "Satipo", "Tarma", "Yauli"]
            },
            {
                id: "huancavelica",
                name: "Huancavelica",
                communes: ["Huancavelica", "Acobamba", "Angaraes", "Castrovirreyna", "Churcampa", "Huaytará", "Tayacaja", "Acobamba", "Angaraes", "Castrovirreyna", "Churcampa", "Huaytará", "Tayacaja"]
            },
            {
                id: "ayacucho",
                name: "Ayacucho",
                communes: ["Ayacucho", "Cangallo", "Huanca Sancos", "Huanta", "La Mar", "Lucanas", "Parinacochas", "Páucar del Sara Sara", "Sucre", "Víctor Fajardo", "Vilcas Huamán", "Cangallo", "Huanca Sancos", "Huanta", "La Mar", "Lucanas", "Parinacochas", "Páucar del Sara Sara", "Sucre", "Víctor Fajardo", "Vilcas Huamán"]
            },
            {
                id: "apurimac",
                name: "Apurímac",
                communes: ["Abancay", "Andahuaylas", "Antabamba", "Aymaraes", "Cotabambas", "Chincheros", "Grau", "Abancay", "Andahuaylas", "Antabamba", "Aymaraes", "Cotabambas", "Chincheros", "Grau"]
            },
            {
                id: "cusco",
                name: "Cusco",
                communes: ["Cusco", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Quispicanchi", "Urubamba", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Quispicanchi", "Urubamba"]
            },
            {
                id: "madre_de_dios",
                name: "Madre de Dios",
                communes: ["Tambopata", "Manu", "Tahuamanu", "Tambopata", "Manu", "Tahuamanu"]
            },
            {
                id: "puno",
                name: "Puno",
                communes: ["Puno", "Azángaro", "Carabaya", "Chucuito", "El Collao", "Huancané", "Lampa", "Melgar", "Moho", "San Antonio de Putina", "San Román", "Sandia", "Yunguyo", "Azángaro", "Carabaya", "Chucuito", "El Collao", "Huancané", "Lampa", "Melgar", "Moho", "San Antonio de Putina", "San Román", "Sandia", "Yunguyo"]
            },
            {
                id: "moquegua",
                name: "Moquegua",
                communes: ["Mariscal Nieto", "General Sánchez Cerro", "Ilo", "Mariscal Nieto", "General Sánchez Cerro", "Ilo"]
            },
            {
                id: "tacna",
                name: "Tacna",
                communes: ["Tacna", "Candarave", "Jorge Basadre", "Tarata", "Candarave", "Jorge Basadre", "Tarata"]
            },
            {
                id: "tumbes",
                name: "Tumbes",
                communes: ["Tumbes", "Contralmirante Villar", "Zarumilla", "Tumbes", "Contralmirante Villar", "Zarumilla"]
            },
            {
                id: "piura",
                name: "Piura",
                communes: ["Piura", "Ayabaca", "Huancabamba", "Morropón", "Paita", "Sullana", "Talara", "Sechura", "Ayabaca", "Huancabamba", "Morropón", "Paita", "Sullana", "Talara", "Sechura"]
            },
            {
                id: "lambayeque",
                name: "Lambayeque",
                communes: ["Chiclayo", "Ferreñafe", "Lambayeque", "Chiclayo", "Ferreñafe", "Lambayeque"]
            },
            {
                id: "la_libertad",
                name: "La Libertad",
                communes: ["Trujillo", "Ascope", "Bolívar", "Chepén", "Julcán", "Otuzco", "Pacasmayo", "Pataz", "Sánchez Carrión", "Santiago de Chuco", "Gran Chimú", "Virú", "Ascope", "Bolívar", "Chepén", "Julcán", "Otuzco", "Pacasmayo", "Pataz", "Sánchez Carrión", "Santiago de Chuco", "Gran Chimú", "Virú"]
            },
            {
                id: "ancash",
                name: "Ancash",
                communes: ["Huaraz", "Aija", "Antonio Raymondi", "Asunción", "Bolognesi", "Carhuaz", "Carlos Fermín Fitzcarrald", "Casma", "Corongo", "Huari", "Huarmey", "Huaylas", "Mariscal Luzuriaga", "Ocros", "Pallasca", "Pomabamba", "Recuay", "Santa", "Sihuas", "Yungay", "Aija", "Antonio Raymondi", "Asunción", "Bolognesi", "Carhuaz", "Carlos Fermín Fitzcarrald", "Casma", "Corongo", "Huari", "Huarmey", "Huaylas", "Mariscal Luzuriaga", "Ocros", "Pallasca", "Pomabamba", "Recuay", "Santa", "Sihuas", "Yungay"]
            },
            {
                id: "junin",
                name: "Junín",
                communes: ["Huancayo", "Chanchamayo", "Chupaca", "Concepción", "Jauja", "Satipo", "Tarma", "Yauli", "Chanchamayo", "Chupaca", "Concepción", "Jauja", "Satipo", "Tarma", "Yauli"]
            },
            {
                id: "huancavelica",
                name: "Huancavelica",
                communes: ["Huancavelica", "Acobamba", "Angaraes", "Castrovirreyna", "Churcampa", "Huaytará", "Tayacaja", "Acobamba", "Angaraes", "Castrovirreyna", "Churcampa", "Huaytará", "Tayacaja"]
            },
            {
                id: "ayacucho",
                name: "Ayacucho",
                communes: ["Ayacucho", "Cangallo", "Huanca Sancos", "Huanta", "La Mar", "Lucanas", "Parinacochas", "Páucar del Sara Sara", "Sucre", "Víctor Fajardo", "Vilcas Huamán", "Cangallo", "Huanca Sancos", "Huanta", "La Mar", "Lucanas", "Parinacochas", "Páucar del Sara Sara", "Sucre", "Víctor Fajardo", "Vilcas Huamán"]
            },
            {
                id: "apurimac",
                name: "Apurímac",
                communes: ["Abancay", "Andahuaylas", "Antabamba", "Aymaraes", "Cotabambas", "Chincheros", "Grau", "Abancay", "Andahuaylas", "Antabamba", "Aymaraes", "Cotabambas", "Chincheros", "Grau"]
            },
            {
                id: "cusco",
                name: "Cusco",
                communes: ["Cusco", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Quispicanchi", "Urubamba", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Quispicanchi", "Urubamba"]
            },
            {
                id: "madre_de_dios",
                name: "Madre de Dios",
                communes: ["Tambopata", "Manu", "Tahuamanu", "Tambopata", "Manu", "Tahuamanu"]
            },
            {
                id: "puno",
                name: "Puno",
                communes: ["Puno", "Azángaro", "Carabaya", "Chucuito", "El Collao", "Huancané", "Lampa", "Melgar", "Moho", "San Antonio de Putina", "San Román", "Sandia", "Yunguyo", "Azángaro", "Carabaya", "Chucuito", "El Collao", "Huancané", "Lampa", "Melgar", "Moho", "San Antonio de Putina", "San Román", "Sandia", "Yunguyo"]
            },
            {
                id: "moquegua",
                name: "Moquegua",
                communes: ["Mariscal Nieto", "General Sánchez Cerro", "Ilo", "Mariscal Nieto", "General Sánchez Cerro", "Ilo"]
            },
            {
                id: "tacna",
                name: "Tacna",
                communes: ["Tacna", "Candarave", "Jorge Basadre", "Tarata", "Candarave", "Jorge Basadre", "Tarata"]
            },
            {
                id: "tumbes",
                name: "Tumbes",
                communes: ["Tumbes", "Contralmirante Villar", "Zarumilla", "Tumbes", "Contralmirante Villar", "Zarumilla"]
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
            },
            {
                id: "cochabamba",
                name: "Cochabamba",
                communes: ["Cochabamba", "Quillacollo", "Sacaba", "Tiquipaya", "Vinto", "Colcapirhua", "Sipe Sipe", "Tunari", "Aiquile", "Totora", "Pocona", "Chimoré", "Puerto Villarroel", "Entre Ríos", "Mizque", "Vila Vila", "Alalay", "Punata", "Villa Rivero", "San Benito", "Tacachi", "Cuchumuela", "Villa Gualberto Villarroel", "San Pedro de Buena Vista", "Tiraque", "Shinahota", "Chimoré", "Puerto Villarroel", "Entre Ríos", "Mizque", "Vila Vila", "Alalay", "Punata", "Villa Rivero", "San Benito", "Tacachi", "Cuchumuela", "Villa Gualberto Villarroel", "San Pedro de Buena Vista", "Tiraque", "Shinahota"]
            },
            {
                id: "oruro",
                name: "Oruro",
                communes: ["Oruro", "Caracollo", "El Choro", "Soracachi", "Challapata", "Santuario de Quillacas", "Pampa Aullagas", "Salinas de Garci Mendoza", "Toledo", "Eucaliptus", "Andamarca", "Belén de Andamarca", "Curahuara de Carangas", "Turco", "Huachacalla", "Escara", "Cruz de Machacamarca", "Yunguyo del Litoral", "Esmeralda", "Totora", "Carangas", "Santiago de Huari", "La Rivera", "Todos Santos", "Tomás Barrón", "Santiago de Machaca", "Catacora", "Charaña", "Waldo Ballivián", "Nazacara de Pacajes", "Desaguadero", "San Andrés de Machaca", "Jesús de Machaca", "Taraco", "Viacha", "Guaqui", "Tiahuanacu", "Desaguadero", "San Andrés de Machaca", "Jesús de Machaca", "Taraco", "Viacha", "Guaqui", "Tiahuanacu"]
            },
            {
                id: "potosi",
                name: "Potosí",
                communes: ["Potosí", "Tupiza", "Uyuni", "Villazón", "Llallagua", "Uncía", "Colquechaca", "Atocha", "Cotagaita", "Vitichi", "Tacobamba", "Betanzos", "Chaqui", "Toro Toro", "Pocoata", "Ravelo", "Puna", "Caiza D", "Ckochas", "San Pedro de Buena Vista", "Toro Toro", "Pocoata", "Ravelo", "Puna", "Caiza D", "Ckochas", "San Pedro de Buena Vista"]
            },
            {
                id: "chuquisaca",
                name: "Chuquisaca",
                communes: ["Sucre", "Monteagudo", "Padilla", "Azurduy", "Tarabuco", "Yamparáez", "Camargo", "San Lucas", "Incahuasi", "Villa Charcas", "Culpina", "Las Carreras", "El Villar", "Tarvita", "Villa Abecia", "Camataqui", "Huacareta", "Macharetí", "Villa Vaca Guzmán", "Muyupampa", "Huacaya", "Boyaibe", "Cuevo", "Gutiérrez", "Lagunillas", "Camiri", "Charagua", "San Antonio del Parapetí", "Cabezas", "Cuevo", "Gutiérrez", "Lagunillas", "Camiri", "Charagua", "San Antonio del Parapetí"]
            },
            {
                id: "tarija",
                name: "Tarija",
                communes: ["Tarija", "Yacuiba", "Villamontes", "Bermejo", "Entre Ríos", "Padcaya", "Uriondo", "San Lorenzo", "El Puente", "Caraparí", "Yunchará", "Villa San Lorenzo", "San Lorenzo", "El Puente", "Caraparí", "Yunchará", "Villa San Lorenzo"]
            },
            {
                id: "beni",
                name: "Beni",
                communes: ["Trinidad", "Riberalta", "Guayaramerín", "Rurrenabaque", "San Borja", "San Ignacio de Moxos", "San Javier", "San Ramón", "Santa Ana del Yacuma", "Santa Rosa", "Reyes", "San Joaquín", "San Ramón", "Santa Ana del Yacuma", "Santa Rosa", "Reyes", "San Joaquín"]
            },
            {
                id: "pando",
                name: "Pando",
                communes: ["Cobija", "Porvenir", "Filadelfia", "Bella Flor", "San Pedro", "Santos Mercado", "Bolpebra", "Ingavi", "Nueva Esperanza", "Villa Nueva", "Lima", "Villa Nueva", "Lima"]
            }
        ]
    }
];

export const getCountryByCode = (code: string): Country | undefined => {
    return COMPLETE_GEO_DATA.find(country => country.code === code);
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