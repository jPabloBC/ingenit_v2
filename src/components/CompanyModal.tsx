"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSidebar } from "@/contexts/SidebarContext";
import { X, Save, UploadCloud, Image, Camera, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { countries, getRegionsByCountry, getCitiesByRegion } from "@/lib/geoAdapter";
import PhoneField from "@/components/PhoneField";

interface Company {
  id?: string;
  name: string;
  document?: string;
  industry: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  comuna?: string;
  country?: string;
  employee_count?: number;
  size_category?: string;
  status: "active" | "inactive" | "prospect";
  logo_url?: string;
}

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated?: () => void;
  editingCompany?: Company | null;
}

function cleanRut(input: string) {
  return input.replace(/[^0-9kK]/g, "").toUpperCase();
}

function formatRut(rut: string) {
  // expects cleaned rut like 12345678K
  const cleaned = rut.replace(/\W/g, "");
  if (cleaned.length <= 1) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  // add dots every 3 chars
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}

function validateRut(rut: string) {
  const r = cleanRut(rut);
  if (!r || r.length < 2) return false;
  const body = r.slice(0, -1);
  let dv = r.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const dvExpected = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
  return dv.toUpperCase() === dvExpected;
}

export default function CompanyModal({ isOpen, onClose, onCompanyCreated, editingCompany }: CompanyModalProps) {
  const [formData, setFormData] = useState<Company>({
    name: "",
    industry: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    region: "",
    comuna: "",
    country: "CL",
    employee_count: undefined,
    status: "prospect",
    logo_url: "",
    document: "",
  });
  // phone stored as E.164 in formData.phone (e.g. +56912345678)
  const [regions, setRegions] = useState<{ code: string; name: string }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>("");
  const [adminEmailToCreate, setAdminEmailToCreate] = useState('');
  const [adminPasswordToCreate, setAdminPasswordToCreate] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminRut, setAdminRut] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminAvailable, setAdminAvailable] = useState<boolean | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const { isCollapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);

  function toTitleCase(str: string) {
    return str
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  const loadAdministratorData = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('pr_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('role', 'admin')
        .single();

      if (data && !error) {
        console.log('Loading administrator data:', data);
        setAdminEmailToCreate(data.email);
        setAdminFirstName(data.nombres || '');
        setAdminLastName(data.apellidos || '');
        
        // Format document for display: if it's a valid RUT, show formatted, otherwise show plain
        const document = data.document || '';
        if (document && validateRut(document)) {
          setAdminRut(formatRut(document));
        } else {
          setAdminRut(document);
        }
        
        setAdminPhone(data.phone || '');
      } else {
        console.error('Error loading administrator:', error);
      }
    } catch (error) {
      console.error('Error loading administrator data:', error);
    }
  };

  const handleAdminFirstNameBlur = () => {
    if (!adminFirstName) return;
    setAdminFirstName(toTitleCase(adminFirstName));
  };

  const handleAdminLastNameBlur = () => {
    if (!adminLastName) return;
    setAdminLastName(toTitleCase(adminLastName));
  };

  useEffect(() => {
    // ensure DOM is available for portal
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editingCompany) {
      // Format document for display: if it's a valid RUT, show formatted, otherwise show plain
      const companyData: any = { ...editingCompany };
      // Backward compatibility: some rows may still have `rut` instead of `document`
      if (!companyData.document && companyData.rut) {
        companyData.document = companyData.rut;
      }
      if (companyData.document) {
        if (validateRut(companyData.document)) {
          companyData.document = formatRut(companyData.document);
        }
        // If not valid RUT, keep as plain text
      }
      
      setFormData(companyData);
      // phone field already stored as E.164 in editingCompany.phone
      
        // if the stored industry isn't one of our predefined ones, treat it as a custom industry
        const predefined = [
          'Agricultura','Construcción','Consultoría','Contratos','Educación','Energía','Hostelería y Turismo','Inmobiliaria','Manufactura','Medios y Entretenimiento','Minería','Retail','Salud','Servicios Financieros','Servicios Públicos','Telecomunicaciones','Tecnología','Transporte y Logística','Otro'
        ];
        if (editingCompany.industry && !predefined.includes(editingCompany.industry)) {
          setFormData(prev => ({ ...prev, industry: 'Otro' } as Company));
          setCustomIndustry(editingCompany.industry);
        }
        
        // Load administrator data for editing
        loadAdministratorData(editingCompany.id);
      } else {
      // Reset form data for new company
      setFormData({
        name: "",
        industry: "",
        website: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        region: "",
        comuna: "",
        country: "CL",
        employee_count: undefined,
        status: "prospect",
        logo_url: "",
        document: "",
      });
      setAdminEmailToCreate('');
      setAdminPasswordToCreate('');
      setAdminFirstName('');
      setAdminLastName('');
      setAdminRut('');
      setAdminPhone('');
      setCustomIndustry('');
      // Limpiar estados de logo para nueva empresa
      setPendingLogoFile(null);
      setLogoPreviewUrl('');
    }
  }, [editingCompany]);

  useEffect(() => {
    // detect if server supports admin creation (has service role key set)
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/available');
        if (!mounted) return;
        const json = await res.json();
        setAdminAvailable(!!json.available);
      } catch (e) {
        setAdminAvailable(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    if (formData.country) {
      const regs = getRegionsByCountry(formData.country) || [];
      type R = { code?: string; name?: string };
      setRegions(regs.map((r: R) => ({ code: r.code || r.name || '', name: r.name || r.code || '' })));
    } else {
      setRegions([]);
    }
    setCities([]);
  }, [formData.country]);

  useEffect(() => {
    if (formData.region && formData.country) {
      const c = getCitiesByRegion(formData.country, formData.region) || [];
      setCities(c);
    } else {
      setCities([]);
    }
  }, [formData.region, formData.country]);

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    let v: any = value;
    if (name === 'email') v = value.toLowerCase();
    if (name === 'name') v = toTitleCase(value);
    if (name === 'employee_count') {
      const num = value === '' ? undefined : Number(value);
      setFormData(prev => ({ ...prev, [name]: num } as Company));
      return;
    }
    // if user selects an industry other than 'Otro', clear any custom industry
    if (name === 'industry' && value !== 'Otro') {
      setCustomIndustry('');
    }
    setFormData(prev => ({ ...prev, [name]: v } as Company));
  };

  // derive company size from employee_count
  function getSizeCategory(count?: number) {
    if (count === undefined || count === null) return '';
    // Ranges (adjust as desired):
    // Micro: 1-9
    // Pequeña: 10-49
    // Mediana: 50-249
    // Grande: 250+
    if (count <= 0) return 'Sin colaboradores';
    if (count <= 9) return 'Micro';
    if (count <= 49) return 'Pequeña';
    if (count <= 249) return 'Mediana';
    return 'Grande';
  }

  const handleAddressBlur = () => {
    const addr = formData.address || '';
    if (!addr) return;
    setFormData(prev => ({ ...prev, address: toTitleCase(addr) } as Company));
  };

  const handleDocumentBlur = () => {
    const raw = formData.document || "";
    if (!raw) return;
    const cleaned = cleanRut(raw);
    if (!cleaned) return;
    if (validateRut(cleaned)) {
      setFormData(prev => ({ ...prev, document: formatRut(cleaned) } as Company));
    } else {
      // keep as cleaned digits (no dots or dash) when invalid
      setFormData(prev => ({ ...prev, document: cleaned } as Company));
    }
  };

  const handleAdminRutBlur = () => {
    const raw = adminRut || "";
    if (!raw) return;
    const cleaned = cleanRut(raw);
    if (!cleaned) return;
    if (validateRut(cleaned)) {
      setAdminRut(formatRut(cleaned));
    } else {
      setAdminRut(cleaned);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Solo subir inmediatamente si estamos editando una empresa existente
    if (editingCompany?.id) {
      await uploadFile(file, editingCompany.id);
    } else {
      // Para nuevas empresas, solo guardar el archivo y mostrar preview
      setPendingLogoFile(file);
      try {
        const url = URL.createObjectURL(file);
        setLogoPreviewUrl(url);
      } catch {}
    }
  };

  // centralized upload used by file input and dropzone
  const uploadFile = async (file: File, companyId?: string) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const slug = (formData.name || 'company').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const ts = Date.now();
      const fileNameOnly = `company-${ts}-${slug}.${fileExt}`;
      const storagePath = companyId
        ? `${companyId}/logo/${fileNameOnly}`
        : `tmp/${ts}-${slug}/logo/${fileNameOnly}`;
      const { data, error: uploadError } = await supabase.storage.from('companies').upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('companies').getPublicUrl(data.path);
      const publicUrl = (pub as any).publicUrl || '';
      setFormData(prev => ({ ...prev, logo_url: publicUrl } as Company));
      setLogoPreviewUrl(publicUrl);
      
      // If editing existing company, update database immediately
      if (companyId && editingCompany?.id) {
        await supabase.from('pr_companies').update({ logo_url: publicUrl }).eq('id', editingCompany.id);
      }
    } catch (err) {
      console.error('Error uploading file', err);
      try {
        const msg = (err as any)?.message || String(err);
        if (/bucket not found/i.test(msg) || /Bucket not found/i.test(msg)) {
          alert('Error: el bucket "companies" no existe en Supabase. Crea el bucket llamado "companies" en el panel de Supabase o ejecuta el script `scripts/create-logos-bucket.js` con la SERVICE_ROLE key.');
        }
      } catch (e) {
        // ignore
      }
    } finally {
      setUploading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSaving(true);
    try {
      // prepare final payload: combine phone prefix + local, ensure email lowercase and title-case name/address
      const payload = { ...formData } as any;
      payload.email = payload.email ? payload.email.toLowerCase() : payload.email;
      payload.name = payload.name ? toTitleCase(payload.name) : payload.name;
      payload.address = payload.address ? toTitleCase(payload.address) : payload.address;
    // phone is stored in formData.phone as E.164 by PhoneField
      payload.phone = payload.phone;
      // ensure website has protocol if provided
      if (payload.website && !/^https?:\/\//i.test(payload.website)) {
        payload.website = `https://${payload.website}`;
      }
      // if industry is 'Otro', require a custom industry value and use it in payload
      if (payload.industry === 'Otro') {
        if (!customIndustry || !customIndustry.trim()) {
          alert('Por favor especifica la industria cuando seleccionas "Otro".');
          setIsSaving(false);
          return;
        }
        payload.industry = customIndustry.trim();
      }

      // compute size category from employee_count and include in payload
      payload.size_category = getSizeCategory(payload.employee_count);
      // If adminEmailToCreate and adminPasswordToCreate are provided and we're creating a new company,
      // call the protected server endpoint which uses the SERVICE_ROLE key.
      if (!editingCompany && adminEmailToCreate && adminPasswordToCreate) {
        if (adminAvailable) {
          // Use protected server endpoint which runs with SERVICE_ROLE key and will create auth user, company
          // and insert the pr_users row server-side (role set by server).
          try {
            const sess = await supabase.auth.getSession();
            console.debug('DEBUG supabase.getSession ->', sess);
            const token = (sess as any)?.data?.session?.access_token;
            console.debug('DEBUG token ->', token ? `${token.slice(0,8)}...${token.slice(-8)}` : token);
            if (!token) {
              alert('Debes iniciar sesión como un usuario con permisos de administrador para crear empresa con administrador.');
              setIsSaving(false);
              return;
            }
            const endpointBody: any = {
              companyName: payload.name,
              adminEmail: adminEmailToCreate,
              adminPassword: adminPasswordToCreate,
              payloadFields: payload,
              // include admin personal details for server to insert into pr_users
              payloadAdmin: {
                nombres: adminFirstName ? toTitleCase(adminFirstName) : undefined,
                apellidos: adminLastName ? toTitleCase(adminLastName) : undefined,
                document: adminRut ? adminRut : undefined,
                phone: adminPhone ? adminPhone : undefined,
              },
              apikey: 'dev',
            };

            const headers: any = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token || ''}`,
            };

            const res = await fetch('/api/admin/create-company', {
              method: 'POST',
              headers,
              body: JSON.stringify(endpointBody),
            });
            const text = await res.text().catch(() => null);
            let json: any = null;
            try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
            console.debug('DEBUG create-company response', res.status, json);
            if (!res.ok) {
              throw new Error((json && (json.error || json.message)) || text || 'create company failed');
            }
            // After company is created, if we have a pending logo file, upload to companies/{uuid}/logo/
            try {
              const createdCompanyId = json?.company?.id || json?.id;
              if (createdCompanyId && pendingLogoFile) {
                await uploadFile(pendingLogoFile, createdCompanyId);
                // Update company with logo URL
                const logoUrl = formData.logo_url;
                if (logoUrl) {
                  await supabase.from('pr_companies').update({ logo_url: logoUrl }).eq('id', createdCompanyId);
                }
                setPendingLogoFile(null);
                setLogoPreviewUrl(''); // Clear preview URL
              }
            } catch (e) {
              console.error('Error finalizing logo upload', e);
            }
          } catch (err) {
            console.error('Error creating company via admin endpoint', err);
            setIsSaving(false);
            alert('Error creando la empresa con administrador: ' + ((err as any)?.message || String(err)));
            return;
          }
        } else {
          // Fallback: create auth user and company with anon client, but pr_users insertion must be done separately by an admin
          // Crear usuario admin con Supabase Auth
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: adminEmailToCreate,
            password: adminPasswordToCreate,
            options: {
              data: {
                nombres: adminFirstName ? toTitleCase(adminFirstName) : undefined,
                apellidos: adminLastName ? toTitleCase(adminLastName) : undefined,
                document: adminRut ? cleanRut(adminRut) : undefined,
                phone: adminPhone ? adminPhone : undefined,
                role: 'admin',
              }
            }
          });
          if (signUpError?.message?.toLowerCase().includes('user already registered')) {
            alert('El correo ingresado ya est\u00e1 registrado como usuario. Por favor ingresa un correo diferente.');
            setIsSaving(false);
            return;
          }
          if (signUpError) throw new Error(signUpError.message || 'Error creando usuario administrador');
          if (!signUpData?.user?.id) throw new Error('No se pudo obtener el ID del usuario administrador');

          // Crear empresa en la vista p\u00fablica pr_companies
          const { error: companyError } = await supabase.from('pr_companies').insert([{ ...payload }]);
          if (companyError) throw companyError;
        }
      } else {
        if (editingCompany && editingCompany.id) {
          const { error } = await supabase.from('pr_companies').update({ ...payload }).eq('id', editingCompany.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('pr_companies').insert([{ ...payload }]);
          if (error) throw error;
        }
      }
      onCompanyCreated?.();
      onClose();
    } catch (err) {
      console.error('Error saving company', err);
    } finally {
      setIsSaving(false);
    }
  };

  const modalMarkup = (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${isCollapsed ? 'lg:left-16' : 'lg:left-64'}`}>
  <div className="w-full max-w-5xl bg-white rounded shadow p-6 lg:p-8 max-h-[95vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{editingCompany ? 'Editar Empresa' : 'Crear Empresa'}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="p-1">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre Empresa</label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">RUT / Documento</label>
              <input name="document" value={formData.document ?? ''} onChange={handleChange} onBlur={handleDocumentBlur} placeholder="12.345.678-K" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">Industria</label>
              <select name="industry" value={formData.industry} onChange={handleChange} className="border p-2 rounded w-full">
                <option value="">Seleccionar industria</option>
                {[
                  'Agricultura','Construcción','Consultoría','Contratos','Educación','Energía','Hostelería y Turismo','Inmobiliaria','Manufactura','Medios y Entretenimiento','Minería','Retail','Salud','Servicios Financieros','Servicios Públicos','Telecomunicaciones','Tecnología','Transporte y Logística','Otro'
                ].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <div className="border p-2 rounded w-full">
                <PhoneField value={formData.phone} onChange={(v) => setFormData(prev => ({ ...prev, phone: v } as Company))} defaultCountry={formData.country || 'CL'} className="w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">País</label>
              <select name="country" value={formData.country} onChange={(e) => {
                handleChange(e);
                setFormData(prev => ({ ...prev, region: '', city: '', comuna: '' } as Company));
              }} className="border p-2 rounded w-full">
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Región / Departamento</label>
              <select name="region" value={formData.region} onChange={(e) => {
                handleChange(e);
                setFormData(prev => ({ ...prev, city: '', comuna: '' } as Company));
              }} className="border p-2 rounded w-full" disabled={!formData.country}>
                <option value="">Seleccionar región</option>
                {regions.map(r => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Ciudad / Comuna</label>
              <select name="city" value={formData.city || formData.comuna || ''} onChange={(e) => {
                const v = e.target.value;
                setFormData(prev => ({ ...prev, city: v, comuna: v } as Company));
              }} className="border p-2 rounded w-full" disabled={!formData.region}>
                <option value="">Seleccionar ciudad / comuna</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Dirección</label>
              <input name="address" value={formData.address} onChange={handleChange} onBlur={handleAddressBlur} placeholder="Dirección" className="border p-2 rounded w-full" />
            </div>

            {/* Admin personal details: nombres, apellidos */}
            <div>
              <label className="block text-sm mb-1">Nombres administrador</label>
              <input value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} onBlur={handleAdminFirstNameBlur} placeholder="Nombres" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">Apellidos administrador</label>
              <input value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} onBlur={handleAdminLastNameBlur} placeholder="Apellidos" className="border p-2 rounded w-full" />
            </div>

            {adminAvailable ? (
              <>
                <div>
                  <label className="block text-sm mb-1">Correo administrador</label>
                  <input id="admin-email" value={adminEmailToCreate} onChange={(e) => setAdminEmailToCreate(e.target.value)} placeholder="Email admin@empresa.com" className="border p-2 rounded w-full" disabled={!!editingCompany} />
                </div>

                <div>
                  <label className="block text-sm mb-1">Contraseña administrador (temporal)</label>
                  <div className="relative">
                    <input id="admin-password" type={showAdminPassword ? "text" : "password"} value={adminPasswordToCreate} onChange={(e) => setAdminPasswordToCreate(e.target.value)} placeholder="Contraseña temporal" className="border p-2 rounded w-full pr-10" disabled={!!editingCompany} />
                    <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm mb-1">Crear administrador</label>
                  <div className="border p-2 rounded w-full text-sm text-gray-500">Funcionalidad no disponible en este entorno</div>
                </div>

                <div>
                  <label className="block text-sm mb-1">Contraseña administrador (temporal)</label>
                  <div className="border p-2 rounded w-full text-sm text-gray-500">—</div>
                </div>
              </>
            )}

            {/* Admin personal details: rut, telefono */}
            <div>
              <label className="block text-sm mb-1">RUT / Documento administrador</label>
              <input value={adminRut} onChange={(e) => setAdminRut(e.target.value)} onBlur={handleAdminRutBlur} placeholder="12.345.678-K" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">Teléfono administrador</label>
              <div className="border p-2 rounded w-full">
                <PhoneField value={adminPhone} onChange={(v) => setAdminPhone(v || '')} defaultCountry={formData.country || 'CL'} className="w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Número de Colaboradores</label>
              <input name="employee_count" value={formData.employee_count ?? ''} onChange={handleChange} placeholder="Número de Colaboradores" type="number" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">Tamaño</label>
              <div className="border p-2 rounded w-full text-base text-gray-600"> <span className="font-medium">{getSizeCategory(formData.employee_count) || '—'}</span></div>
            </div>

            <div>
              <label htmlFor="company-website" className="block text-sm mb-1">Website</label>
              <input id="company-website" name="website" value={formData.website} onChange={handleChange} onBlur={() => {
                const w = (formData.website || '').toString().trim();
                if (w && !/^https?:\/\//i.test(w)) {
                  setFormData(prev => ({ ...prev, website: `https://${w}` } as Company));
                }
              }} placeholder="Website" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block text-sm mb-1">Logo</label>
              <div
                className="border p-2 rounded w-full flex items-start justify-start cursor-pointer hover:border-gray-400 border-gray-300"
                onClick={() => (document.getElementById('company-logo-hidden') as HTMLInputElement | null)?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer?.files?.[0];
                  if (f) uploadFile(f);
                }}
              >
                {uploading ? (
                  <div className="text-sm">Subiendo...</div>
                ) : (logoPreviewUrl || formData.logo_url) ? (
                  <img src={logoPreviewUrl || formData.logo_url || ''} alt="logo" className="h-10" />
                ) : (
                  <div className="text-sm text-gray-500 flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Image className="w-6 h-6" strokeWidth="1.5" />
                      <div className="text-xs mt-1">PNG, JPG o GIF — máximo 5MB</div>
                    </div>
                  </div>
                )}
                <input id="company-logo-hidden" type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>
            </div>

            <div>
              <label className="block text-sm">Estado</label>
              <select name="status" value={formData.status} onChange={handleChange} className="border p-2 rounded w-full">
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-amber-600 text-white rounded flex items-center gap-2">
              {uploading ? <UploadCloud className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
              {isSaving ? 'Guardando...' : editingCompany ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalMarkup, document.body);
}