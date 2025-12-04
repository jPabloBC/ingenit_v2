// Lista de países con códigos de área, regiones y datos relevantes
export interface Country {
  code: string;
  name: string;
  dialCode: string;
  regions?: Region[];
}

export interface Region {
  code: string;
  name: string;
  cities?: string[];
}

export const countries: Country[] = [
  {
    code: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    regions: [
      { code: 'CABA', name: 'Ciudad Autónoma de Buenos Aires', cities: ['Buenos Aires'] },
      { code: 'BA', name: 'Buenos Aires', cities: ['La Plata', 'Mar del Plata', 'Bahía Blanca', 'Tandil', 'Olavarría'] },
      { code: 'CAT', name: 'Catamarca', cities: ['San Fernando del Valle de Catamarca', 'Andalgalá', 'Belén'] },
      { code: 'CHA', name: 'Chaco', cities: ['Resistencia', 'Barranqueras', 'Sáenz Peña'] },
      { code: 'CHU', name: 'Chubut', cities: ['Rawson', 'Comodoro Rivadavia', 'Puerto Madryn', 'Trelew'] },
      { code: 'COR', name: 'Córdoba', cities: ['Córdoba', 'Río Cuarto', 'Villa Carlos Paz', 'San Francisco'] },
      { code: 'COR', name: 'Corrientes', cities: ['Corrientes', 'Goya', 'Mercedes'] },
      { code: 'ER', name: 'Entre Ríos', cities: ['Paraná', 'Concordia', 'Gualeguaychú'] },
      { code: 'FOR', name: 'Formosa', cities: ['Formosa', 'Clorinda', 'Pirané'] },
      { code: 'JUJ', name: 'Jujuy', cities: ['San Salvador de Jujuy', 'Palpalá', 'Perico'] },
      { code: 'LP', name: 'La Pampa', cities: ['Santa Rosa', 'General Pico', 'Toay'] },
      { code: 'LR', name: 'La Rioja', cities: ['La Rioja', 'Chilecito', 'Aimogasta'] },
      { code: 'MEN', name: 'Mendoza', cities: ['Mendoza', 'San Rafael', 'Godoy Cruz', 'Guaymallén'] },
      { code: 'MIS', name: 'Misiones', cities: ['Posadas', 'Oberá', 'Eldorado'] },
      { code: 'NEU', name: 'Neuquén', cities: ['Neuquén', 'Cipolletti', 'Plottier'] },
      { code: 'RN', name: 'Río Negro', cities: ['Viedma', 'San Carlos de Bariloche', 'General Roca'] },
      { code: 'SAL', name: 'Salta', cities: ['Salta', 'San Ramón de la Nueva Orán', 'Tartagal'] },
      { code: 'SJ', name: 'San Juan', cities: ['San Juan', 'Rawson', 'Chimbas'] },
      { code: 'SL', name: 'San Luis', cities: ['San Luis', 'Villa Mercedes', 'Merlo'] },
      { code: 'SC', name: 'Santa Cruz', cities: ['Río Gallegos', 'Caleta Olivia', 'El Calafate'] },
      { code: 'SF', name: 'Santa Fe', cities: ['Santa Fe', 'Rosario', 'Rafaela', 'Reconquista'] },
      { code: 'SDE', name: 'Santiago del Estero', cities: ['Santiago del Estero', 'La Banda', 'Termas de Río Hondo'] },
      { code: 'TF', name: 'Tierra del Fuego', cities: ['Ushuaia', 'Río Grande', 'Tolhuin'] },
      { code: 'TUC', name: 'Tucumán', cities: ['San Miguel de Tucumán', 'Yerba Buena', 'Banda del Río Salí'] }
    ]
  },
  {
    code: 'BO',
    name: 'Bolivia',
    dialCode: '+591',
    regions: [
      { code: 'CHU', name: 'Chuquisaca', cities: ['Sucre', 'Camargo', 'Tarabuco'] },
      { code: 'LP', name: 'La Paz', cities: ['La Paz', 'El Alto', 'Viacha'] },
      { code: 'CB', name: 'Cochabamba', cities: ['Cochabamba', 'Quillacollo', 'Sacaba'] },
      { code: 'OR', name: 'Oruro', cities: ['Oruro', 'Challapata', 'Llallagua'] },
      { code: 'PT', name: 'Potosí', cities: ['Potosí', 'Uyuni', 'Tupiza'] },
      { code: 'TJ', name: 'Tarija', cities: ['Tarija', 'Yacuiba', 'Villamontes'] },
      { code: 'SC', name: 'Santa Cruz', cities: ['Santa Cruz de la Sierra', 'Montero', 'Warnes'] },
      { code: 'BE', name: 'Beni', cities: ['Trinidad', 'Riberalta', 'Guayamerín'] },
      { code: 'PA', name: 'Pando', cities: ['Cobija', 'Porvenir', 'Filadelfia'] }
    ]
  },
  {
    code: 'BR',
    name: 'Brasil',
    dialCode: '+55',
    regions: [
      { code: 'AC', name: 'Acre', cities: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'] },
      { code: 'AL', name: 'Alagoas', cities: ['Maceió', 'Arapiraca', 'Palmeira dos Índios'] },
      { code: 'AP', name: 'Amapá', cities: ['Macapá', 'Santana', 'Laranjal do Jari'] },
      { code: 'AM', name: 'Amazonas', cities: ['Manaus', 'Parintins', 'Itacoatiara'] },
      { code: 'BA', name: 'Bahia', cities: ['Salvador', 'Feira de Santana', 'Vitória da Conquista'] },
      { code: 'CE', name: 'Ceará', cities: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte'] },
      { code: 'DF', name: 'Distrito Federal', cities: ['Brasília', 'Taguatinga', 'Ceilândia'] },
      { code: 'ES', name: 'Espírito Santo', cities: ['Vitória', 'Vila Velha', 'Serra'] },
      { code: 'GO', name: 'Goiás', cities: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis'] },
      { code: 'MA', name: 'Maranhão', cities: ['São Luís', 'Imperatriz', 'Timon'] },
      { code: 'MT', name: 'Mato Grosso', cities: ['Cuiabá', 'Várzea Grande', 'Rondonópolis'] },
      { code: 'MS', name: 'Mato Grosso do Sul', cities: ['Campo Grande', 'Dourados', 'Três Lagoas'] },
      { code: 'MG', name: 'Minas Gerais', cities: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'] },
      { code: 'PA', name: 'Pará', cities: ['Belém', 'Ananindeua', 'Santarém'] },
      { code: 'PB', name: 'Paraíba', cities: ['João Pessoa', 'Campina Grande', 'Santa Rita'] },
      { code: 'PR', name: 'Paraná', cities: ['Curitiba', 'Londrina', 'Maringá'] },
      { code: 'PE', name: 'Pernambuco', cities: ['Recife', 'Jaboatão dos Guararapes', 'Olinda'] },
      { code: 'PI', name: 'Piauí', cities: ['Teresina', 'Parnaíba', 'Picos'] },
      { code: 'RJ', name: 'Rio de Janeiro', cities: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu'] },
      { code: 'RN', name: 'Rio Grande do Norte', cities: ['Natal', 'Mossoró', 'Parnamirim'] },
      { code: 'RS', name: 'Rio Grande do Sul', cities: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas'] },
      { code: 'RO', name: 'Rondônia', cities: ['Porto Velho', 'Ji-Paraná', 'Ariquemes'] },
      { code: 'RR', name: 'Roraima', cities: ['Boa Vista', 'Rorainópolis', 'Caracaraí'] },
      { code: 'SC', name: 'Santa Catarina', cities: ['Florianópolis', 'Joinville', 'Blumenau'] },
      { code: 'SP', name: 'São Paulo', cities: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo'] },
      { code: 'SE', name: 'Sergipe', cities: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto'] },
      { code: 'TO', name: 'Tocantins', cities: ['Palmas', 'Araguaína', 'Gurupi'] }
    ]
  },
  {
    code: 'CL',
    name: 'Chile',
    dialCode: '+56',
    regions: [
      {
        code: 'AP',
        name: 'Arica y Parinacota',
        cities: ['Arica', 'Putre', 'General Lagos', 'Camarones']
      },
      {
        code: 'TA',
        name: 'Tarapacá',
        cities: ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica']
      },
      {
        code: 'AN',
        name: 'Antofagasta',
        cities: ['Antofagasta', 'Calama', 'Tocopilla', 'Mejillones', 'Taltal']
      },
      {
        code: 'AT',
        name: 'Atacama',
        cities: ['Copiapó', 'Vallenar', 'Caldera', 'Chañaral', 'Diego de Almagro']
      },
      {
        code: 'CO',
        name: 'Coquimbo',
        cities: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña']
      },
      {
        code: 'VS',
        name: 'Valparaíso',
        cities: ['Valparaíso', 'Viña del Mar', 'San Antonio', 'Quilpué', 'Villa Alemana', 'Casablanca']
      },
      {
        code: 'RM',
        name: 'Metropolitana de Santiago',
        cities: ['Santiago', 'Puente Alto', 'Maipú', 'Las Condes', 'La Florida', 'Providencia', 'Ñuñoa', 'San Bernardo']
      },
      {
        code: 'LI',
        name: 'Libertador Bernardo O\'Higgins',
        cities: ['Rancagua', 'San Fernando', 'Pichilemu', 'Santa Cruz', 'Machali']
      },
      {
        code: 'ML',
        name: 'Maule',
        cities: ['Talca', 'Curicó', 'Linares', 'Cauquenes', 'Constitución']
      },
      {
        code: 'BI',
        name: 'Biobío',
        cities: ['Concepción', 'Talcahuano', 'Chillán', 'Los Ángeles', 'Coronel']
      },
      {
        code: 'AR',
        name: 'Araucanía',
        cities: ['Temuco', 'Villarrica', 'Pucón', 'Angol', 'Nueva Imperial']
      },
      {
        code: 'LR',
        name: 'Los Ríos',
        cities: ['Valdivia', 'La Unión', 'Río Bueno', 'Panguipulli']
      },
      {
        code: 'LL',
        name: 'Los Lagos',
        cities: ['Puerto Montt', 'Osorno', 'Castro', 'Ancud', 'Puerto Varas']
      },
      {
        code: 'AI',
        name: 'Aysén',
        cities: ['Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane']
      },
      {
        code: 'MA',
        name: 'Magallanes y Antártica',
        cities: ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Puerto Williams']
      }
    ]
  },
  {
    code: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    regions: [
      { code: 'DC', name: 'Bogotá D.C.', cities: ['Bogotá'] },
      { code: 'AMA', name: 'Amazonas', cities: ['Leticia', 'Puerto Nariño'] },
      { code: 'ANT', name: 'Antioquia', cities: ['Medellín', 'Bello', 'Itagüí', 'Envigado'] },
      { code: 'ARA', name: 'Arauca', cities: ['Arauca', 'Saravena', 'Fortul'] },
      { code: 'ATL', name: 'Atlántico', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga'] },
      { code: 'BOL', name: 'Bolívar', cities: ['Cartagena', 'Magangué', 'Turbaco'] },
      { code: 'BOY', name: 'Boyacá', cities: ['Tunja', 'Duitama', 'Sogamoso'] },
      { code: 'CAL', name: 'Caldas', cities: ['Manizales', 'Villamaría', 'La Dorada'] },
      { code: 'CAQ', name: 'Caquetá', cities: ['Florencia', 'San Vicente del Caguán'] },
      { code: 'CAS', name: 'Casanare', cities: ['Yopal', 'Aguazul', 'Villanueva'] },
      { code: 'CAU', name: 'Cauca', cities: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'] },
      { code: 'CES', name: 'Cesar', cities: ['Valledupar', 'Aguachica', 'Bosconia'] },
      { code: 'CHO', name: 'Chocó', cities: ['Quibdó', 'Istmina', 'Condoto'] },
      { code: 'COR', name: 'Córdoba', cities: ['Montería', 'Lorica', 'Cereté'] },
      { code: 'CUN', name: 'Cundinamarca', cities: ['Soacha', 'Girardot', 'Zipaquirá', 'Facatativá'] },
      { code: 'GUA', name: 'Guainía', cities: ['Inírida', 'Barrancominas'] },
      { code: 'GUV', name: 'Guaviare', cities: ['San José del Guaviare', 'Calamar'] },
      { code: 'HUI', name: 'Huila', cities: ['Neiva', 'Pitalito', 'Garzón'] },
      { code: 'LAG', name: 'La Guajira', cities: ['Riohacha', 'Maicao', 'Uribia'] },
      { code: 'MAG', name: 'Magdalena', cities: ['Santa Marta', 'Ciénaga', 'Fundación'] },
      { code: 'MET', name: 'Meta', cities: ['Villavicencio', 'Acacías', 'Granada'] },
      { code: 'NAR', name: 'Nariño', cities: ['Pasto', 'Tumaco', 'Ipiales'] },
      { code: 'NSA', name: 'Norte de Santander', cities: ['Cúcuta', 'Ocaña', 'Pamplona'] },
      { code: 'PUT', name: 'Putumayo', cities: ['Mocoa', 'Puerto Asís', 'Orito'] },
      { code: 'QUI', name: 'Quindío', cities: ['Armenia', 'Calarcá', 'La Tebaida'] },
      { code: 'RIS', name: 'Risaralda', cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'] },
      { code: 'SAP', name: 'San Andrés y Providencia', cities: ['San Andrés', 'Providencia'] },
      { code: 'SAN', name: 'Santander', cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta'] },
      { code: 'SUC', name: 'Sucre', cities: ['Sincelejo', 'Corozal', 'Sampués'] },
      { code: 'TOL', name: 'Tolima', cities: ['Ibagué', 'Espinal', 'Melgar'] },
      { code: 'VAC', name: 'Valle del Cauca', cities: ['Cali', 'Palmira', 'Buenaventura', 'Cartago'] },
      { code: 'VAU', name: 'Vaupés', cities: ['Mitú', 'Carurú'] },
      { code: 'VIC', name: 'Vichada', cities: ['Puerto Carreño', 'La Primavera'] }
    ]
  },
  {
    code: 'EC',
    name: 'Ecuador',
    dialCode: '+593',
    regions: [
      { code: 'AZU', name: 'Azuay', cities: ['Cuenca', 'Gualaceo', 'Paute'] },
      { code: 'BOL', name: 'Bolívar', cities: ['Guaranda', 'San Miguel', 'Chillanes'] },
      { code: 'CAN', name: 'Cañar', cities: ['Azogues', 'La Troncal', 'Cañar'] },
      { code: 'CAR', name: 'Carchi', cities: ['Tulcán', 'San Gabriel', 'Montúfar'] },
      { code: 'CHI', name: 'Chimborazo', cities: ['Riobamba', 'Alausí', 'Guano'] },
      { code: 'COT', name: 'Cotopaxi', cities: ['Latacunga', 'La Maná', 'Salcedo'] },
      { code: 'EOR', name: 'El Oro', cities: ['Machala', 'Pasaje', 'Santa Rosa'] },
      { code: 'ESM', name: 'Esmeraldas', cities: ['Esmeraldas', 'Atacames', 'Muisne'] },
      { code: 'GAL', name: 'Galápagos', cities: ['Puerto Baquerizo Moreno', 'Puerto Ayora'] },
      { code: 'GUA', name: 'Guayas', cities: ['Guayaquil', 'Durán', 'Milagro'] },
      { code: 'IMB', name: 'Imbabura', cities: ['Ibarra', 'Otavalo', 'Cotacachi'] },
      { code: 'LOJ', name: 'Loja', cities: ['Loja', 'Catamayo', 'Cariamanga'] },
      { code: 'LOR', name: 'Los Ríos', cities: ['Babahoyo', 'Quevedo', 'Ventanas'] },
      { code: 'MAN', name: 'Manabí', cities: ['Portoviejo', 'Manta', 'Chone'] },
      { code: 'MSZ', name: 'Morona Santiago', cities: ['Macas', 'Gualaquiza', 'Sucúa'] },
      { code: 'NAP', name: 'Napo', cities: ['Tena', 'Archidona', 'El Chaco'] },
      { code: 'ORE', name: 'Orellana', cities: ['Francisco de Orellana', 'La Joya de los Sachas'] },
      { code: 'PAS', name: 'Pastaza', cities: ['Puyo', 'Mera', 'Santa Clara'] },
      { code: 'PIC', name: 'Pichincha', cities: ['Quito', 'Cayambe', 'Mejía'] },
      { code: 'SET', name: 'Santa Elena', cities: ['Santa Elena', 'La Libertad', 'Salinas'] },
      { code: 'SDO', name: 'Santo Domingo de los Tsáchilas', cities: ['Santo Domingo', 'La Concordia'] },
      { code: 'SUC', name: 'Sucumbíos', cities: ['Nueva Loja', 'Gonzalo Pizarro', 'Putumayo'] },
      { code: 'TUN', name: 'Tungurahua', cities: ['Ambato', 'Baños', 'Pelileo'] },
      { code: 'ZCH', name: 'Zamora Chinchipe', cities: ['Zamora', 'Yantzaza', 'Gualaquiza'] }
    ]
  },
  {
    code: 'GF',
    name: 'Guayana Francesa',
    dialCode: '+594',
    regions: [
      { code: 'CAY', name: 'Cayena', cities: ['Cayena', 'Remire-Montjoly'] },
      { code: 'SLM', name: 'Saint-Laurent-du-Maroni', cities: ['Saint-Laurent-du-Maroni', 'Mana'] }
    ]
  },
  {
    code: 'GY',
    name: 'Guyana',
    dialCode: '+592',
    regions: [
      { code: 'BA', name: 'Barima-Waini', cities: ['Mabaruma', 'Port Kaituma'] },
      { code: 'CU', name: 'Cuyuni-Mazaruni', cities: ['Bartica', 'Mahdia'] },
      { code: 'DE', name: 'Demerara-Mahaica', cities: ['Georgetown', 'Triumph'] },
      { code: 'EB', name: 'East Berbice-Corentyne', cities: ['New Amsterdam', 'Corriverton'] },
      { code: 'ES', name: 'Essequibo Islands-West Demerara', cities: ['Vreed en Hoop', 'Parika'] },
      { code: 'MA', name: 'Mahaica-Berbice', cities: ['Fort Wellington', 'Mahaicony'] },
      { code: 'PM', name: 'Pomeroon-Supenaam', cities: ['Anna Regina', 'Charity'] },
      { code: 'PT', name: 'Potaro-Siparuni', cities: ['Mahdia', 'Paramakatoi'] },
      { code: 'UD', name: 'Upper Demerara-Berbice', cities: ['Linden', 'Kwakwani'] },
      { code: 'UT', name: 'Upper Takutu-Upper Essequibo', cities: ['Lethem', 'Good Hope'] }
    ]
  },
  {
    code: 'PY',
    name: 'Paraguay',
    dialCode: '+595',
    regions: [
      { code: 'ASU', name: 'Asunción', cities: ['Asunción'] },
      { code: 'CON', name: 'Concepción', cities: ['Concepción', 'Horqueta', 'Loreto'] },
      { code: 'SPE', name: 'San Pedro', cities: ['San Pedro', 'Capiibary', 'San Estanislao'] },
      { code: 'COR', name: 'Cordillera', cities: ['Caacupé', 'Tobatí', 'Atyrá'] },
      { code: 'GUA', name: 'Guairá', cities: ['Villarrica', 'Coronel Oviedo', 'Caazapá'] },
      { code: 'CAA', name: 'Caaguazú', cities: ['Coronel Oviedo', 'Caaguazú', 'Repatriación'] },
      { code: 'CAZ', name: 'Caazapá', cities: ['Caazapá', 'San Juan Nepomuceno'] },
      { code: 'ITA', name: 'Itapúa', cities: ['Encarnación', 'Capitán Miranda', 'María Auxiliadora'] },
      { code: 'MIS', name: 'Misiones', cities: ['San Juan Bautista', 'Ayolas', 'San Ignacio'] },
      { code: 'PAR', name: 'Paraguarí', cities: ['Paraguarí', 'Piribebuy', 'Carapeguá'] },
      { code: 'AHA', name: 'Alto Paraná', cities: ['Ciudad del Este', 'Hernandarias', 'Presidente Franco'] },
      { code: 'CEN', name: 'Central', cities: ['Lambaré', 'San Lorenzo', 'Capiatá', 'Luque'] },
      { code: 'ÑEE', name: 'Ñeembucú', cities: ['Pilar', 'Villalbín', 'Guazu Cuá'] },
      { code: 'AMB', name: 'Amambay', cities: ['Pedro Juan Caballero', 'Bella Vista Norte'] },
      { code: 'CAN', name: 'Canindeyú', cities: ['Salto del Guairá', 'Curuguaty'] },
      { code: 'PHA', name: 'Presidente Hayes', cities: ['Villa Hayes', 'Pozo Colorado'] },
      { code: 'BOQ', name: 'Boquerón', cities: ['Filadelfia', 'Loma Plata'] },
      { code: 'AAP', name: 'Alto Paraguay', cities: ['Fuerte Olimpo', 'Puerto Casado'] }
    ]
  },
  {
    code: 'PE',
    name: 'Perú',
    dialCode: '+51',
    regions: [
      { code: 'LMA', name: 'Lima', cities: ['Lima', 'Callao', 'San Juan de Lurigancho'] },
      { code: 'ARE', name: 'Arequipa', cities: ['Arequipa', 'Mollendo', 'Camaná'] },
      { code: 'TRU', name: 'La Libertad', cities: ['Trujillo', 'Chepén', 'Pacasmayo'] },
      { code: 'PIU', name: 'Piura', cities: ['Piura', 'Sullana', 'Talara'] },
      { code: 'LAM', name: 'Lambayeque', cities: ['Chiclayo', 'Lambayeque', 'Ferreñafe'] },
      { code: 'ANC', name: 'Ancash', cities: ['Huaraz', 'Chimbote', 'Casma'] },
      { code: 'CAJ', name: 'Cajamarca', cities: ['Cajamarca', 'Jaén', 'Chota'] },
      { code: 'LOR', name: 'Loreto', cities: ['Iquitos', 'Yurimaguas', 'Nauta'] },
      { code: 'UCY', name: 'Ucayali', cities: ['Pucallpa', 'Aguaytía', 'Contamana'] },
      { code: 'JUN', name: 'Junín', cities: ['Huancayo', 'Tarma', 'La Oroya'] },
      { code: 'ICA', name: 'Ica', cities: ['Ica', 'Chincha Alta', 'Pisco'] },
      { code: 'HUV', name: 'Huancavelica', cities: ['Huancavelica', 'Paucará', 'Acobambilla'] },
      { code: 'AYA', name: 'Ayacucho', cities: ['Ayacucho', 'Huanta', 'San José de Ticllas'] },
      { code: 'APU', name: 'Apurímac', cities: ['Abancay', 'Andahuaylas', 'Antabamba'] },
      { code: 'CUS', name: 'Cusco', cities: ['Cusco', 'Sicuani', 'Quillabamba'] },
      { code: 'HUC', name: 'Huánuco', cities: ['Huánuco', 'Tingo María', 'Ambo'] },
      { code: 'PAS', name: 'Pasco', cities: ['Cerro de Pasco', 'Oxapampa', 'La Merced'] },
      { code: 'SMA', name: 'San Martín', cities: ['Moyobamba', 'Tarapoto', 'Juanjuí'] },
      { code: 'AMA', name: 'Amazonas', cities: ['Chachapoyas', 'Bagua', 'Utcubamba'] },
      { code: 'TUM', name: 'Tumbes', cities: ['Tumbes', 'Zarumilla', 'Contralmirante Villar'] },
      { code: 'TAC', name: 'Tacna', cities: ['Tacna', 'Locumba', 'Ilabaya'] },
      { code: 'MOQ', name: 'Moquegua', cities: ['Moquegua', 'Ilo', 'Omate'] },
      { code: 'PUN', name: 'Puno', cities: ['Puno', 'Juliaca', 'Ilave'] },
      { code: 'MDR', name: 'Madre de Dios', cities: ['Puerto Maldonado', 'Iñapari', 'Laberinto'] }
    ]
  },
  {
    code: 'SR',
    name: 'Surinam',
    dialCode: '+597',
    regions: [
      { code: 'BR', name: 'Brokopondo', cities: ['Brokopondo', 'Brownsweg'] },
      { code: 'CM', name: 'Commewijne', cities: ['Nieuw Amsterdam', 'Tamanredjo'] },
      { code: 'CR', name: 'Coronie', cities: ['Totness', 'Friendship'] },
      { code: 'MA', name: 'Marowijne', cities: ['Albina', 'Moengo'] },
      { code: 'NI', name: 'Nickerie', cities: ['Nieuw Nickerie', 'Wageningen'] },
      { code: 'PR', name: 'Para', cities: ['Onverwacht', 'Paranam'] },
      { code: 'PM', name: 'Paramaribo', cities: ['Paramaribo'] },
      { code: 'SA', name: 'Saramacca', cities: ['Groningen', 'Uitkijk'] },
      { code: 'SI', name: 'Sipaliwini', cities: ['Apoera', 'Kwamalasamutu'] },
      { code: 'WA', name: 'Wanica', cities: ['Lelydorp', 'Houttuin'] }
    ]
  },
  {
    code: 'UY',
    name: 'Uruguay',
    dialCode: '+598',
    regions: [
      { code: 'AR', name: 'Artigas', cities: ['Artigas', 'Bella Unión', 'Tomás Gomensoro'] },
      { code: 'CA', name: 'Canelones', cities: ['Canelones', 'Las Piedras', 'Pando'] },
      { code: 'CL', name: 'Cerro Largo', cities: ['Melo', 'Río Branco', 'Fraile Muerto'] },
      { code: 'CO', name: 'Colonia', cities: ['Colonia del Sacramento', 'Juan Lacaze', 'Rosario'] },
      { code: 'DU', name: 'Durazno', cities: ['Durazno', 'Sarandí del Yí', 'Villa del Carmen'] },
      { code: 'FS', name: 'Flores', cities: ['Trinidad', 'Ismael Cortinas', 'Andresito'] },
      { code: 'FD', name: 'Florida', cities: ['Florida', 'Sarandí Grande', 'Fray Marcos'] },
      { code: 'LA', name: 'Lavalleja', cities: ['Minas', 'José Pedro Varela', 'Solís de Mataojo'] },
      { code: 'MA', name: 'Maldonado', cities: ['Maldonado', 'Punta del Este', 'San Carlos'] },
      { code: 'MO', name: 'Montevideo', cities: ['Montevideo'] },
      { code: 'PA', name: 'Paysandú', cities: ['Paysandú', 'Guichón', 'Quebracho'] },
      { code: 'RN', name: 'Río Negro', cities: ['Fray Bentos', 'Young', 'Nuevo Berlín'] },
      { code: 'RV', name: 'Rivera', cities: ['Rivera', 'Tranqueras', 'Vichadero'] },
      { code: 'RO', name: 'Rocha', cities: ['Rocha', 'Chuy', 'La Paloma'] },
      { code: 'SA', name: 'Salto', cities: ['Salto', 'Constitución', 'Belén'] },
      { code: 'SJ', name: 'San José', cities: ['San José de Mayo', 'Ciudad del Plata', 'Libertad'] },
      { code: 'SO', name: 'Soriano', cities: ['Mercedes', 'Dolores', 'Cardona'] },
      { code: 'TA', name: 'Tacuarembó', cities: ['Tacuarembó', 'Paso de los Toros', 'San Gregorio de Polanco'] },
      { code: 'TT', name: 'Treinta y Tres', cities: ['Treinta y Tres', 'Vergara', 'Santa Clara de Olimar'] }
    ]
  },
  {
    code: 'VE',
    name: 'Venezuela',
    dialCode: '+58',
    regions: [
      { code: 'DC', name: 'Distrito Capital', cities: ['Caracas'] },
      { code: 'AM', name: 'Amazonas', cities: ['Puerto Ayacucho', 'La Esmeralda'] },
      { code: 'AN', name: 'Anzoátegui', cities: ['Barcelona', 'Puerto La Cruz', 'El Tigre'] },
      { code: 'AP', name: 'Apure', cities: ['San Fernando de Apure', 'Achaguas'] },
      { code: 'AR', name: 'Aragua', cities: ['Maracay', 'Turmero', 'La Victoria'] },
      { code: 'BA', name: 'Barinas', cities: ['Barinas', 'Barinitas', 'Santa Bárbara'] },
      { code: 'BO', name: 'Bolívar', cities: ['Ciudad Bolívar', 'Puerto Ordaz', 'Upata'] },
      { code: 'CA', name: 'Carabobo', cities: ['Valencia', 'Puerto Cabello', 'San Diego'] },
      { code: 'CO', name: 'Cojedes', cities: ['San Carlos', 'Tinaquillo', 'El Pao'] },
      { code: 'DA', name: 'Delta Amacuro', cities: ['Tucupita', 'Pedernales'] },
      { code: 'FA', name: 'Falcón', cities: ['Coro', 'Punto Fijo', 'Santa Ana de Coro'] },
      { code: 'GU', name: 'Guárico', cities: ['San Juan de los Morros', 'Calabozo', 'Valle de la Pascua'] },
      { code: 'LA', name: 'Lara', cities: ['Barquisimeto', 'Cabudare', 'El Tocuyo'] },
      { code: 'ME', name: 'Mérida', cities: ['Mérida', 'El Vigía', 'Tovar'] },
      { code: 'MI', name: 'Miranda', cities: ['Los Teques', 'Guarenas', 'Guatire'] },
      { code: 'MO', name: 'Monagas', cities: ['Maturín', 'Temblador', 'Punta de Mata'] },
      { code: 'NE', name: 'Nueva Esparta', cities: ['La Asunción', 'Porlamar', 'Juan Griego'] },
      { code: 'PO', name: 'Portuguesa', cities: ['Guanare', 'Acarigua', 'Araure'] },
      { code: 'SU', name: 'Sucre', cities: ['Cumaná', 'Carúpano', 'Güiria'] },
      { code: 'TA', name: 'Táchira', cities: ['San Cristóbal', 'Táriba', 'Rubio'] },
      { code: 'TR', name: 'Trujillo', cities: ['Trujillo', 'Valera', 'Boconó'] },
      { code: 'VA', name: 'Vargas', cities: ['La Guaira', 'Catia La Mar', 'Macuto'] },
      { code: 'YA', name: 'Yaracuy', cities: ['San Felipe', 'Yaritagua', 'Chivacoa'] },
      { code: 'ZU', name: 'Zulia', cities: ['Maracaibo', 'San Francisco', 'Cabimas'] }
    ]
  }
];

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code);
};

export const getRegionsByCountry = (countryCode: string): Region[] => {
  const country = getCountryByCode(countryCode);
  return country?.regions || [];
};

export const getCitiesByRegion = (countryCode: string, regionCode: string): string[] => {
  const regions = getRegionsByCountry(countryCode);
  const region = regions.find(r => r.code === regionCode);
  return region?.cities || [];
};