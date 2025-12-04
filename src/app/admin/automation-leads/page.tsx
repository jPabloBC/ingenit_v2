"use client";
import { useEffect, useState } from "react";
// Componentes UI simplificados
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>{children}</div>
);

const CardContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {children}
    </span>
);

const Button = ({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button 
        onClick={onClick}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${className}`}
    >
        {children}
    </button>
);

const Input = ({ value, onChange, placeholder, className = "" }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string }) => (
    <input 
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
);

const Select = ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <select 
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
        {children}
    </select>
);

const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectValue = ({ placeholder }: { placeholder: string }) => <option value="">{placeholder}</option>;
const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
);
import { 
    Users, 
    Clock, 
    DollarSign, 
    Calendar, 
    Building, 
    Target, 
    AlertTriangle,
    CheckCircle,
    XCircle,
    Star
} from "lucide-react";

interface AutomationLead {
    id: string;
    session_id: string;
    contact_name: string;
    contact_email: string;
    industry: string;
    solution_type: string;
    project_description: string;
    users_count: number;
    timeline: string;
    current_systems: string;
    budget_range: string;
    technical_requirements: string;
    lead_score: number;
    status: string;
    notes: string;
    created_at: string;
}

export default function AutomationLeadsPage() {
    const [leads, setLeads] = useState<AutomationLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await fetch("/api/process-leads");
            const data = await response.json();
            if (data.success) {
                setLeads(data.leads);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const processNewLeads = async () => {
        try {
            const response = await fetch("/api/process-leads", { method: "POST" });
            const data = await response.json();
            if (data.success) {
                await fetchLeads();
                alert(`Procesados ${data.processed} nuevos leads`);
            }
        } catch (error) {
            console.error("Error processing leads:", error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "hot": return "bg-red-100 text-red-800";
            case "warm": return "bg-orange-100 text-orange-800";
            case "cold": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 60) return "text-red-600";
        if (score >= 40) return "text-orange-600";
        if (score >= 20) return "text-blue-600";
        return "text-gray-600";
    };

    const filteredLeads = leads.filter(lead => {
        const matchesFilter = filter === "all" || lead.status === filter;
        const matchesSearch = 
            lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.process_type?.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Leads de Automatización</h1>
                    <p className="text-gray-600 mt-2">
                        Gestión de prospectos interesados en automatización
                    </p>
                </div>
                <Button onClick={processNewLeads} className="bg-blue-600 hover:bg-blue-700">
                    Procesar Nuevos Leads
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-600">Total Leads</p>
                                <p className="text-2xl font-bold">{leads.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="text-sm text-gray-600">Hot Leads</p>
                                <p className="text-2xl font-bold">
                                    {leads.filter(l => l.status === "hot").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Target className="h-5 w-5 text-orange-600" />
                            <div>
                                <p className="text-sm text-gray-600">Warm Leads</p>
                                <p className="text-2xl font-bold">
                                    {leads.filter(l => l.status === "warm").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-600">Promedio Score</p>
                                <p className="text-2xl font-bold">
                                    {leads.length > 0 
                                        ? Math.round(leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length)
                                        : 0
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex space-x-4">
                <Input
                    placeholder="Buscar por nombre, email, industria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                />
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                        <SelectItem value="new">Nuevos</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Leads List */}
            <div className="space-y-4">
                {filteredLeads.map((lead) => (
                    <Card key={lead.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <h3 className="text-lg font-semibold">{lead.contact_name}</h3>
                                        <Badge className={getStatusColor(lead.status)}>
                                            {lead.status.toUpperCase()}
                                        </Badge>
                                        <div className={`flex items-center space-x-1 ${getScoreColor(lead.lead_score)}`}>
                                            <Star className="h-4 w-4" />
                                            <span className="font-semibold">{lead.lead_score}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Building className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{lead.industry || "No especificado"}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Target className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{lead.solution_type || "No especificado"}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Users className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{lead.users_count} usuarios</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{lead.timeline || "No especificado"}</span>
                                        </div>
                                    </div>

                                    {lead.project_description && (
                                        <div className="mb-3">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <Target className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-700">Descripción del proyecto:</span>
                                            </div>
                                            <p className="text-sm text-gray-600 ml-6">{lead.project_description}</p>
                                        </div>
                                    )}

                                    {lead.technical_requirements && (
                                        <div className="mb-3">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                <span className="text-sm font-medium text-gray-700">Requerimientos técnicos:</span>
                                            </div>
                                            <p className="text-sm text-gray-600 ml-6">{lead.technical_requirements}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>{lead.contact_email}</span>
                                        <span>•</span>
                                        <span>Presupuesto: {lead.budget_range || "No especificado"}</span>
                                        <span>•</span>
                                        <span>Timeline: {lead.timeline || "No especificado"}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredLeads.length === 0 && (
                <div className="text-center py-12">
                    <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron leads</h3>
                    <p className="text-gray-600">
                        {searchTerm || filter !== "all" 
                            ? "Intenta ajustar los filtros de búsqueda"
                            : "No hay leads procesados aún. Haz clic en 'Procesar Nuevos Leads' para comenzar."
                        }
                    </p>
                </div>
            )}
        </div>
    );
}
