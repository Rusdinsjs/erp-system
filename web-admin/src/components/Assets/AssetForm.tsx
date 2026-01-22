// AssetForm - Pure Tailwind Version
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Car, Building2, DollarSign, FileText, Info, Plus, Trash2 } from 'lucide-react';
import type { Asset, CreateAssetRequest } from '../../api/assets';
import { departmentApi } from '../../api/departments';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Button,
    Input,
    Select,
    Textarea,
    NumberInput,
    DateInput,
    Tabs, TabsList, TabsTrigger, TabsContent,
    ActionIcon,
} from '../ui';
import { CreateCategoryModal } from './CreateCategoryModal';

interface Category {
    id: string;
    name: string;
    code: string;
    full_path?: string;
    main_category?: string;
}

interface AssetFormProps {
    initialValues?: Asset | null;
    categories: Category[];
    locations: { id: string; name: string }[];
    onSubmit: (values: CreateAssetRequest) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

// ATTRIBUTE_TEMPLATES removed - now dynamic from Database


export function AssetForm({ initialValues, categories, locations, onSubmit, onCancel, isLoading }: AssetFormProps) {
    const { user } = useAuthStore();

    // Form State
    const [formData, setFormData] = useState({
        asset_code: initialValues?.asset_code || '',
        name: initialValues?.name || '',
        category_id: initialValues?.category_id || '',
        location_id: initialValues?.location_id || '',
        department_id: initialValues?.department_id || '',
        status: initialValues?.status || 'planning',
        serial_number: initialValues?.serial_number || '',
        brand: initialValues?.brand || '',
        model: initialValues?.model || '',
        year_manufacture: initialValues?.year_manufacture,
        purchase_date: initialValues?.purchase_date ? new Date(initialValues.purchase_date) : null,
        purchase_price: initialValues?.purchase_price,
        residual_value: initialValues?.residual_value,
        useful_life_months: initialValues?.useful_life_months,
        notes: initialValues?.notes || '',
        is_rental: initialValues?.is_rental || false,
        is_fuel: initialValues?.is_fuel || false,
        // Vehicle Details
        vehicle_license_plate: initialValues?.vehicle_details?.license_plate || '',
        vehicle_vin: initialValues?.vehicle_details?.vin || '',
        vehicle_engine_number: initialValues?.vehicle_details?.engine_number || '',
        vehicle_color: initialValues?.vehicle_details?.color || '',
        vehicle_bpkb_number: initialValues?.vehicle_details?.bpkb_number || '',
        vehicle_stnk_expiry: initialValues?.vehicle_details?.stnk_expiry ? new Date(initialValues.vehicle_details.stnk_expiry) : null,
        vehicle_kir_expiry: initialValues?.vehicle_details?.kir_expiry ? new Date(initialValues.vehicle_details.kir_expiry) : null,
        vehicle_fuel_type: initialValues?.vehicle_details?.fuel_type || '',
        vehicle_transmission: initialValues?.vehicle_details?.transmission || '',
        vehicle_capacity: initialValues?.vehicle_details?.capacity || '',
        vehicle_odometer: initialValues?.vehicle_details?.odometer_last,
        // Building Details
        building_address: initialValues?.specifications?.address || '',
        building_city: initialValues?.specifications?.city || '',
        building_land_area: initialValues?.specifications?.land_area,
        building_building_area: initialValues?.specifications?.building_area,
        building_certificate_number: initialValues?.specifications?.certificate_number || '',
        building_pbb_number: initialValues?.specifications?.pbb_number || '',
        building_certificate_expiry: initialValues?.specifications?.certificate_expiry ? new Date(initialValues.specifications.certificate_expiry) : null,
    });

    // Sync state when initialValues changes (e.g. opening edit modal)
    useEffect(() => {
        if (initialValues) {
            setFormData({
                asset_code: initialValues.asset_code || '',
                name: initialValues.name || '',
                category_id: initialValues.category_id || '',
                location_id: initialValues.location_id || '',
                department_id: initialValues.department_id || '',
                status: initialValues.status || 'planning',
                serial_number: initialValues.serial_number || '',
                brand: initialValues.brand || '',
                model: initialValues.model || '',
                year_manufacture: initialValues.year_manufacture,
                purchase_date: initialValues.purchase_date ? new Date(initialValues.purchase_date) : null,
                purchase_price: initialValues.purchase_price,
                residual_value: initialValues.residual_value,
                useful_life_months: initialValues.useful_life_months,
                notes: initialValues.notes || '',
                is_rental: initialValues.is_rental || false,
                is_fuel: initialValues.is_fuel || false,
                // Vehicle Details
                vehicle_license_plate: initialValues.vehicle_details?.license_plate || '',
                vehicle_vin: initialValues.vehicle_details?.vin || '',
                vehicle_engine_number: initialValues.vehicle_details?.engine_number || '',
                vehicle_color: initialValues.vehicle_details?.color || '',
                vehicle_bpkb_number: initialValues.vehicle_details?.bpkb_number || '',
                vehicle_stnk_expiry: initialValues.vehicle_details?.stnk_expiry ? new Date(initialValues.vehicle_details.stnk_expiry) : null,
                vehicle_kir_expiry: initialValues.vehicle_details?.kir_expiry ? new Date(initialValues.vehicle_details.kir_expiry) : null,
                vehicle_fuel_type: initialValues.vehicle_details?.fuel_type || '',
                vehicle_transmission: initialValues.vehicle_details?.transmission || '',
                vehicle_capacity: initialValues.vehicle_details?.capacity || '',
                vehicle_odometer: initialValues.vehicle_details?.odometer_last,
                // Building Details
                building_address: initialValues.specifications?.address || '',
                building_city: initialValues.specifications?.city || '',
                building_land_area: initialValues.specifications?.land_area,
                building_building_area: initialValues.specifications?.building_area,
                building_certificate_number: initialValues.specifications?.certificate_number || '',
                building_pbb_number: initialValues.specifications?.pbb_number || '',
                building_certificate_expiry: initialValues.specifications?.certificate_expiry ? new Date(initialValues.specifications.certificate_expiry) : null,
            });

            // Sync custom specs
            const specs = initialValues.specifications;
            if (specs && typeof specs === 'object' && !specs.address) {
                setCustomSpecs(Object.entries(specs).map(([key, value]) => ({
                    key,
                    value: String(value)
                })));
            } else {
                setCustomSpecs([]);
            }
        } else {
            // Reset to defaults if creating new (optional, but good practice if modal doesn't unmount)
            setFormData({
                asset_code: '',
                name: '',
                category_id: '',
                location_id: '',
                department_id: '',
                status: 'planning',
                serial_number: '',
                brand: '',
                model: '',
                year_manufacture: undefined, // undefined for number inputs usually better than empty string
                purchase_date: null,
                purchase_price: undefined,
                residual_value: undefined,
                useful_life_months: undefined,
                notes: '',
                is_rental: false,
                is_fuel: false,
                vehicle_license_plate: '',
                vehicle_vin: '',
                vehicle_engine_number: '',
                vehicle_color: '',
                vehicle_bpkb_number: '',
                vehicle_stnk_expiry: null,
                vehicle_kir_expiry: null,
                vehicle_fuel_type: '',
                vehicle_transmission: '',
                vehicle_capacity: '',
                vehicle_odometer: undefined,
                building_address: '',
                building_city: '',
                building_land_area: undefined,
                building_building_area: undefined,
                building_certificate_number: '',
                building_pbb_number: '',
                building_certificate_expiry: null,
            });
            setCustomSpecs([]);
        }
    }, [initialValues]);

    // Custom Attributes State
    const [customSpecs, setCustomSpecs] = useState<{ key: string; value: string }[]>(() => {
        const specs = initialValues?.specifications;
        // Simple heuristic: if specs exists and doesn't look like building specs (no address), treat as custom
        if (specs && typeof specs === 'object' && !specs.address) {
            return Object.entries(specs).map(([key, value]) => ({
                key,
                value: String(value)
            }));
        }
        return [];
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const { data: departmentData } = useQuery({
        queryKey: ['departments'],
        queryFn: departmentApi.list,
        staleTime: 1000 * 60 * 5 // 5 mins
    });

    const categoryOptions = useMemo(() => {
        return categories.map(c => ({
            value: c.id,
            label: c.full_path || c.name,
        }));
    }, [categories]);

    const locationOptions = useMemo(() => {
        return locations.map(l => ({
            value: l.id,
            label: l.name,
        }));
    }, [locations]);

    const departmentOptions = useMemo(() => {
        return departmentData?.map(d => ({
            value: d.id,
            label: d.name,
        })) || [];
    }, [departmentData]);

    const selectedCategory = categories.find(c => c.id === formData.category_id);

    const isVehicle = useMemo(() => {
        if (!selectedCategory) return false;
        const code = selectedCategory.code || '';
        const main = selectedCategory.main_category || '';
        return code.includes('ALAT-BERAT') || code.includes('TRUK') || code.includes('KENDARAAN') || code.includes('RINGAN') || main.includes('RENTAL') || main.includes('OPERASIONAL');
    }, [selectedCategory]);

    const isBuilding = useMemo(() => {
        if (!selectedCategory) return false;
        const code = selectedCategory.code || '';
        return code.includes('BANGUNAN') || code.includes('TANAH') || code.includes('INFRA');
    }, [selectedCategory]);

    // Template Pre-fill Logic (Dynamic from DB)
    useEffect(() => {
        if (!selectedCategory || isVehicle || isBuilding) return;

        // Check if category has dynamic attributes
        // @ts-ignore - attributes might not be in the strict type yet if not updated
        const attributes = selectedCategory.attributes as string[] | undefined;

        if (!attributes || attributes.length === 0) return;

        // Only apply template if specs are not 'dirty' (have values entered)
        const isDirty = customSpecs.some(s => s.value.trim() !== '');
        if (isDirty) return;

        // Apply attributes from DB
        setCustomSpecs(attributes.map(k => ({ key: k, value: '' })));

    }, [selectedCategory?.id, isVehicle, isBuilding]);

    // Custom Spec Handlers
    const addSpec = () => {
        setCustomSpecs([...customSpecs, { key: '', value: '' }]);
    };

    const removeSpec = (index: number) => {
        setCustomSpecs(customSpecs.filter((_, i) => i !== index));
    };

    const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
        const newSpecs = [...customSpecs];
        newSpecs[index][field] = val;
        setCustomSpecs(newSpecs);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.asset_code) newErrors.asset_code = 'Asset code is required';
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.category_id) newErrors.category_id = 'Category is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const payload: any = {
            asset_code: formData.asset_code,
            name: formData.name,
            category_id: formData.category_id,
            location_id: formData.location_id || undefined,
            department_id: formData.department_id || undefined,
            status: formData.status,
            serial_number: formData.serial_number || undefined,
            brand: formData.brand || undefined,
            model: formData.model || undefined,
            year_manufacture: formData.year_manufacture,
            purchase_date: formData.purchase_date?.toISOString().split('T')[0],
            purchase_price: formData.purchase_price,
            residual_value: formData.residual_value,
            useful_life_months: formData.useful_life_months,
            notes: formData.notes || undefined,
            is_rental: formData.is_rental,
            is_fuel: formData.is_fuel,
        };

        // Vehicle details
        if (isVehicle) {
            payload.vehicle_details = {
                license_plate: formData.vehicle_license_plate,
                vin: formData.vehicle_vin,
                engine_number: formData.vehicle_engine_number,
                color: formData.vehicle_color,
                bpkb_number: formData.vehicle_bpkb_number,
                stnk_expiry: formData.vehicle_stnk_expiry?.toISOString().split('T')[0],
                kir_expiry: formData.vehicle_kir_expiry?.toISOString().split('T')[0],
                fuel_type: formData.vehicle_fuel_type,
                transmission: formData.vehicle_transmission,
                capacity: formData.vehicle_capacity,
                odometer_last: formData.vehicle_odometer,
            };
        }

        // Building details
        if (isBuilding) {
            payload.specifications = {
                address: formData.building_address,
                city: formData.building_city,
                land_area: formData.building_land_area,
                building_area: formData.building_building_area,
                certificate_number: formData.building_certificate_number,
                pbb_number: formData.building_pbb_number,
                certificate_expiry: formData.building_certificate_expiry?.toISOString().split('T')[0],
            };
        }

        // Generic / Custom Specs
        if (!isVehicle && !isBuilding && customSpecs.length > 0) {
            const specObj: Record<string, string> = {};
            customSpecs.forEach(spec => {
                if (spec.key.trim()) {
                    specObj[spec.key.trim()] = spec.value.trim();
                }
            });
            if (Object.keys(specObj).length > 0) {
                payload.specifications = specObj;
            }
        }

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <Tabs defaultValue="general">
                <div className="flex items-center justify-between mb-8">
                    <TabsList className="bg-white/5 p-1 rounded-2xl backdrop-blur-md border border-white/5">
                        <TabsTrigger
                            value="general"
                            icon={<Info size={18} />}
                            className="px-6 py-2.5 rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300"
                        >
                            General
                        </TabsTrigger>
                        <TabsTrigger
                            value="details"
                            icon={isVehicle ? <Car size={18} /> : isBuilding ? <Building2 size={18} /> : <FileText size={18} />}
                            className="px-6 py-2.5 rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300"
                        >
                            {isVehicle ? 'Vehicle' : isBuilding ? 'Property' : 'Specifications'}
                        </TabsTrigger>
                        <TabsTrigger
                            value="financial"
                            icon={<DollarSign size={18} />}
                            className="px-6 py-2.5 rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-300"
                        >
                            Financial
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* General Tab */}
                <TabsContent value="general" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Primary Info Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors duration-500" />
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                                    Identity & Category
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Asset Code"
                                        placeholder="e.g. AST-001"
                                        value={formData.asset_code}
                                        onChange={(e) => updateField('asset_code', e.target.value)}
                                        error={errors.asset_code}
                                        required
                                        className="bg-black/20 border-white/5 focus:border-cyan-500/50 transition-all"
                                    />
                                    <Select
                                        label="Status"
                                        value={formData.status}
                                        onChange={(val) => updateField('status', val)}
                                        options={[
                                            { value: 'planning', label: 'Planning' },
                                            { value: 'active', label: 'Active' },
                                            { value: 'maintenance', label: 'Maintenance' },
                                            { value: 'disposed', label: 'Disposed' },
                                            { value: 'sold', label: 'Sold' },
                                            { value: 'lost', label: 'Lost/Missing' },
                                            { value: 'archived', label: 'Archived' },
                                        ]}
                                    />
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Asset Name"
                                            placeholder="Enter descriptive name"
                                            value={formData.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            error={errors.name}
                                            required
                                            className="bg-black/20 border-white/5 focus:border-cyan-500/50 transition-all"
                                        />
                                    </div>
                                    <Select
                                        label="Category"
                                        value={formData.category_id}
                                        onChange={(val) => updateField('category_id', val)}
                                        options={categoryOptions}
                                        placeholder="Select category..."
                                        error={errors.category_id}
                                        required
                                        onCreate={() => setShowCategoryModal(true)}
                                    />
                                    <Select
                                        label="Location"
                                        value={formData.location_id}
                                        onChange={(val) => updateField('location_id', val)}
                                        options={locationOptions}
                                        placeholder="Select location..."
                                        onCreate={() => window.open('/locations', '_blank')}
                                    />
                                </div>
                            </div>

                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                    Manufacturing & Brand
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Input
                                        label="Brand"
                                        value={formData.brand}
                                        onChange={(e) => updateField('brand', e.target.value)}
                                        className="bg-black/20 border-white/5"
                                    />
                                    <Input
                                        label="Model"
                                        value={formData.model}
                                        onChange={(e) => updateField('model', e.target.value)}
                                        className="bg-black/20 border-white/5"
                                    />
                                    <NumberInput
                                        label="Year"
                                        value={formData.year_manufacture}
                                        onChange={(val) => updateField('year_manufacture', val)}
                                        className="bg-black/20 border-white/5"
                                    />
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Serial Number"
                                            value={formData.serial_number}
                                            onChange={(e) => updateField('serial_number', e.target.value)}
                                            className="bg-black/20 border-white/5"
                                        />
                                    </div>
                                    <Select
                                        label="Department"
                                        value={formData.department_id}
                                        onChange={(val) => updateField('department_id', val)}
                                        options={departmentOptions}
                                        placeholder="Select department..."
                                        onCreate={() => window.open('/departments', '_blank')}
                                        disabled={!!user?.department && user.role !== 'super_admin'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Settings & Notes */}
                        <div className="space-y-6">
                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl h-fit">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                    Operations
                                </h3>
                                <div className="space-y-4">
                                    <div className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all duration-300 cursor-pointer"
                                        onClick={() => updateField('is_rental', !formData.is_rental)}>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${formData.is_rental ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                            {formData.is_rental && <Plus size={14} className="text-white rotate-45" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white text-sm">Rentable Asset</p>
                                            <p className="text-xs text-slate-500">Allow this asset to be rented</p>
                                        </div>
                                    </div>

                                    <div className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all duration-300 cursor-pointer"
                                        onClick={() => updateField('is_fuel', !formData.is_fuel)}>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${formData.is_fuel ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                            {formData.is_fuel && <Plus size={14} className="text-white rotate-45" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white text-sm">Fuel Consumption</p>
                                            <p className="text-xs text-slate-500">Asset requires fuel monitoring</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl flex-1">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-slate-500 rounded-full" />
                                    Additional Notes
                                </h3>
                                <Textarea
                                    placeholder="Enter any additional information..."
                                    value={formData.notes}
                                    onChange={(e) => updateField('notes', e.target.value)}
                                    rows={8}
                                    className="bg-black/20 border-white/5 focus:border-white/20 resize-none rounded-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[3rem] p-10 shadow-xl relative overflow-hidden min-h-[400px]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />

                        {isVehicle ? (
                            <div className="space-y-8 relative">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                        <Car size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Vehicle Specifications</h3>
                                        <p className="text-slate-400">Manage technical details for this vehicle/heavy equipment</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <Input
                                        label="License Plate"
                                        placeholder="B 1234 ABC"
                                        value={formData.vehicle_license_plate}
                                        onChange={(e) => updateField('vehicle_license_plate', e.target.value)}
                                    />
                                    <Input
                                        label="VIN (Chassis No)"
                                        value={formData.vehicle_vin}
                                        onChange={(e) => updateField('vehicle_vin', e.target.value)}
                                    />
                                    <Input
                                        label="Engine Number"
                                        value={formData.vehicle_engine_number}
                                        onChange={(e) => updateField('vehicle_engine_number', e.target.value)}
                                    />
                                    <Input
                                        label="Color"
                                        value={formData.vehicle_color}
                                        onChange={(e) => updateField('vehicle_color', e.target.value)}
                                    />
                                    <Input
                                        label="BPKB Number"
                                        value={formData.vehicle_bpkb_number}
                                        onChange={(e) => updateField('vehicle_bpkb_number', e.target.value)}
                                    />
                                    <NumberInput
                                        label="Current Odometer (KM)"
                                        value={formData.vehicle_odometer}
                                        onChange={(val) => updateField('vehicle_odometer', val)}
                                    />
                                    <DateInput
                                        label="STNK Expiry"
                                        value={formData.vehicle_stnk_expiry}
                                        onChange={(date) => updateField('vehicle_stnk_expiry', date)}
                                    />
                                    <DateInput
                                        label="KIR Expiry"
                                        value={formData.vehicle_kir_expiry}
                                        onChange={(date) => updateField('vehicle_kir_expiry', date)}
                                    />
                                    <Select
                                        label="Fuel Type"
                                        value={formData.vehicle_fuel_type}
                                        onChange={(val) => updateField('vehicle_fuel_type', val)}
                                        options={[
                                            { value: 'Petrol', label: 'Petrol' },
                                            { value: 'Diesel', label: 'Diesel' },
                                            { value: 'Electric', label: 'Electric' },
                                            { value: 'Hybrid', label: 'Hybrid' },
                                        ]}
                                    />
                                    <Select
                                        label="Transmission"
                                        value={formData.vehicle_transmission}
                                        onChange={(val) => updateField('vehicle_transmission', val)}
                                        options={[
                                            { value: 'Manual', label: 'Manual' },
                                            { value: 'Automatic', label: 'Automatic' },
                                        ]}
                                    />
                                    <Input
                                        label="Capacity (CC/Ton)"
                                        value={formData.vehicle_capacity}
                                        onChange={(e) => updateField('vehicle_capacity', e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : isBuilding ? (
                            <div className="space-y-8 relative">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                        <Building2 size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Property Details</h3>
                                        <p className="text-slate-400">Land, buildings, and infrastructure information</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Address"
                                            value={formData.building_address}
                                            onChange={(e) => updateField('building_address', e.target.value)}
                                        />
                                    </div>
                                    <Input
                                        label="City / Region"
                                        value={formData.building_city}
                                        onChange={(e) => updateField('building_city', e.target.value)}
                                    />
                                    <Input
                                        label="Certificate Number (SHM/HGB)"
                                        value={formData.building_certificate_number}
                                        onChange={(e) => updateField('building_certificate_number', e.target.value)}
                                    />
                                    <NumberInput
                                        label="Land Area (m²)"
                                        value={formData.building_land_area}
                                        onChange={(val) => updateField('building_land_area', val)}
                                    />
                                    <NumberInput
                                        label="Building Area (m²)"
                                        value={formData.building_building_area}
                                        onChange={(val) => updateField('building_building_area', val)}
                                    />
                                    <Input
                                        label="PBB Number (NOP)"
                                        value={formData.building_pbb_number}
                                        onChange={(e) => updateField('building_pbb_number', e.target.value)}
                                    />
                                    <DateInput
                                        label="Certificate Expiry"
                                        value={formData.building_certificate_expiry}
                                        onChange={(date) => updateField('building_certificate_expiry', date)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-500/20 rounded-3xl flex items-center justify-center text-slate-400 shadow-[0_0_30px_rgba(100,116,139,0.2)]">
                                            <FileText size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">Custom Specifications</h3>
                                            <p className="text-slate-400">Define unique attributes for this asset</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="md"
                                        variant="outline"
                                        type="button"
                                        onClick={addSpec}
                                        leftIcon={<Plus size={18} />}
                                        className="rounded-2xl border-white/10"
                                    >
                                        Add Attribute
                                    </Button>
                                </div>

                                {customSpecs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-black/20 rounded-[2rem] border border-dashed border-white/10">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Plus size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-lg font-medium">No custom attributes yet</p>
                                        <p className="text-sm opacity-60">Add attributes like Color, Weight, or Technical Specs</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {customSpecs.map((spec, index) => (
                                        <div key={index} className="flex gap-4 items-start p-4 bg-white/5 rounded-[1.5rem] border border-white/5 group transition-all duration-300 hover:bg-white/[0.08]">
                                            <div className="flex-1 space-y-3">
                                                <Input
                                                    placeholder="Attribute Name"
                                                    value={spec.key}
                                                    onChange={(e) => updateSpec(index, 'key', e.target.value)}
                                                    className="bg-black/30 border-transparent focus:border-white/10"
                                                />
                                                <Input
                                                    placeholder="Value"
                                                    value={spec.value}
                                                    onChange={(e) => updateSpec(index, 'value', e.target.value)}
                                                    className="bg-black/30 border-transparent focus:border-white/10"
                                                />
                                            </div>
                                            <ActionIcon
                                                variant="danger"
                                                className="mt-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all rounded-xl"
                                                type="button"
                                                onClick={() => removeSpec(index)}
                                            >
                                                <Trash2 size={18} />
                                            </ActionIcon>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Financial Tab */}
                <TabsContent value="financial" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[3rem] p-10 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-16 h-16 bg-amber-500/20 rounded-3xl flex items-center justify-center text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                <DollarSign size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Financial Details</h3>
                                <p className="text-slate-400">Track purchase history, valuation, and depreciation</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            <div className="space-y-8">
                                <DateInput
                                    label="Purchase Date"
                                    value={formData.purchase_date}
                                    onChange={(date) => updateField('purchase_date', date)}
                                />
                                <NumberInput
                                    label="Purchase Price"
                                    prefix="Rp "
                                    value={formData.purchase_price}
                                    onChange={(val) => updateField('purchase_price', val)}
                                    thousandSeparator
                                />
                            </div>
                            <div className="space-y-8">
                                <NumberInput
                                    label="Residual Value"
                                    prefix="Rp "
                                    value={formData.residual_value}
                                    onChange={(val) => updateField('residual_value', val)}
                                    thousandSeparator
                                />
                                <NumberInput
                                    label="Useful Life (Months)"
                                    value={formData.useful_life_months}
                                    onChange={(val) => updateField('useful_life_months', val)}
                                />
                            </div>
                            <div className="bg-amber-500/5 rounded-[2rem] p-8 border border-amber-500/10 flex flex-col justify-center items-center text-center space-y-4">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Value Depreciation</p>
                                    <p className="text-xs text-slate-500 px-4">These values are used to calculate current book value and maintenance thresholds.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
                <Button
                    variant="ghost"
                    type="button"
                    onClick={onCancel}
                    className="px-8 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    loading={isLoading}
                    leftIcon={<Save size={20} />}
                    className="px-10 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-[0_10px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_30px_rgba(6,182,212,0.4)] transition-all duration-300"
                >
                    Save Asset
                </Button>
            </div>

            {/* Quick Create Category Modal */}
            <CreateCategoryModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSuccess={(newId) => {
                    updateField('category_id', newId);
                }}
            />
        </form>
    );
}


