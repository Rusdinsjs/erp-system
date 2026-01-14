// AssetForm - Pure Tailwind
import { useMemo, useState } from 'react';
import {
    Car, Coins, FileText, Info, Save, Building,
} from 'lucide-react';
import type { Asset, CreateAssetRequest } from '../api/assets';
import { useAuthStore } from '../store/useAuthStore';
import {
    Button, Input, Select, NumberInput, DateInput, Textarea,
    Tabs, TabsList, TabsTrigger, TabsContent
} from '../components/ui';

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

export function AssetForm({ initialValues, categories, locations, onSubmit, onCancel, isLoading }: AssetFormProps) {
    const { user } = useAuthStore();

    const [form, setForm] = useState({
        asset_code: initialValues?.asset_code || '',
        name: initialValues?.name || '',
        category_id: initialValues?.category_id || '',
        location_id: initialValues?.location_id || '',
        department_id: initialValues?.department_id || '',
        status: initialValues?.status || 'planning',
        condition_id: initialValues?.condition_id,

        serial_number: initialValues?.serial_number || '',
        brand: initialValues?.brand || '',
        model: initialValues?.model || '',
        year_manufacture: initialValues?.year_manufacture,

        // Financial
        purchase_date: initialValues?.purchase_date ? new Date(initialValues.purchase_date) : null,
        purchase_price: initialValues?.purchase_price,
        residual_value: initialValues?.residual_value,
        useful_life_months: initialValues?.useful_life_months,

        notes: initialValues?.notes || '',

        // Vehicle Details
        vehicle_details: {
            license_plate: initialValues?.vehicle_details?.license_plate || '',
            brand: initialValues?.vehicle_details?.brand || '',
            model: initialValues?.vehicle_details?.model || '',
            color: initialValues?.vehicle_details?.color || '',
            vin: initialValues?.vehicle_details?.vin || '',
            engine_number: initialValues?.vehicle_details?.engine_number || '',
            bpkb_number: initialValues?.vehicle_details?.bpkb_number || '',
            stnk_expiry: initialValues?.vehicle_details?.stnk_expiry ? new Date(initialValues.vehicle_details.stnk_expiry) : null,
            kir_expiry: initialValues?.vehicle_details?.kir_expiry ? new Date(initialValues.vehicle_details.kir_expiry) : null,
            tax_expiry: initialValues?.vehicle_details?.tax_expiry ? new Date(initialValues.vehicle_details.tax_expiry) : null,
            fuel_type: initialValues?.vehicle_details?.fuel_type || '',
            transmission: initialValues?.vehicle_details?.transmission || '',
            capacity: initialValues?.vehicle_details?.capacity || '',
            odometer_last: initialValues?.vehicle_details?.odometer_last,
        },

        // Building Details
        building_details: {
            address: initialValues?.specifications?.address || '',
            city: initialValues?.specifications?.city || '',
            land_area: initialValues?.specifications?.land_area,
            building_area: initialValues?.specifications?.building_area,
            certificate_number: initialValues?.specifications?.certificate_number || '',
            pbb_number: initialValues?.specifications?.pbb_number || '',
            certificate_expiry: initialValues?.specifications?.certificate_expiry ? new Date(initialValues.specifications.certificate_expiry) : null,
        }
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const categoryOptions = useMemo(() => {
        return categories.map(c => ({
            value: c.id,
            label: c.full_path || c.name,
            code: c.code,
            main: c.main_category
        }));
    }, [categories]);

    const selectedCategory = categoryOptions.find(c => c.value === form.category_id);

    const isVehicle = useMemo(() => {
        if (!selectedCategory) return false;
        const code = selectedCategory.code || '';
        const main = selectedCategory.main || '';
        return code.includes('ALAT-BERAT') || code.includes('TRUK') || code.includes('KENDARAAN') || code.includes('RINGAN') || main.includes('RENTAL') || main.includes('OPERASIONAL');
    }, [selectedCategory]);

    const isBuilding = useMemo(() => {
        if (!selectedCategory) return false;
        const code = selectedCategory.code || '';
        return code.includes('BANGUNAN') || code.includes('TANAH') || code.includes('INFRA');
    }, [selectedCategory]);

    const updateForm = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    };

    const updateVehicle = (key: string, value: any) => {
        setForm(prev => ({ ...prev, vehicle_details: { ...prev.vehicle_details, [key]: value } }));
    };

    const updateBuilding = (key: string, value: any) => {
        setForm(prev => ({ ...prev, building_details: { ...prev.building_details, [key]: value } }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.asset_code) newErrors.asset_code = 'Code is required';
        if (!form.name) newErrors.name = 'Name is required';
        if (!form.category_id) newErrors.category_id = 'Category is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const payload: any = {
            ...form,
            purchase_date: form.purchase_date?.toISOString().split('T')[0],
        };

        if (isVehicle) {
            payload.vehicle_details = {
                ...form.vehicle_details,
                stnk_expiry: form.vehicle_details.stnk_expiry?.toISOString().split('T')[0],
                kir_expiry: form.vehicle_details.kir_expiry?.toISOString().split('T')[0],
                tax_expiry: form.vehicle_details.tax_expiry?.toISOString().split('T')[0]
            };
        } else {
            delete payload.vehicle_details;
        }

        if (isBuilding) {
            payload.specifications = {
                ...initialValues?.specifications,
                address: form.building_details.address,
                city: form.building_details.city,
                land_area: form.building_details.land_area,
                building_area: form.building_details.building_area,
                certificate_number: form.building_details.certificate_number,
                pbb_number: form.building_details.pbb_number,
                certificate_expiry: form.building_details.certificate_expiry?.toISOString().split('T')[0]
            };
        }

        delete payload.building_details;
        if (!payload.location_id) delete payload.location_id;

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="general">
                <TabsList className="mb-6">
                    <TabsTrigger value="general" icon={<Info size={14} />}>General</TabsTrigger>
                    <TabsTrigger
                        value="details"
                        icon={isVehicle ? <Car size={14} /> : isBuilding ? <Building size={14} /> : <FileText size={14} />}
                    >
                        {isVehicle ? 'Vehicle Details' : isBuilding ? 'Property Details' : 'Specifications'}
                    </TabsTrigger>
                    <TabsTrigger value="financial" icon={<Coins size={14} />}>Financial</TabsTrigger>
                    <TabsTrigger value="docs" icon={<FileText size={14} />}>Docs</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Asset Code" value={form.asset_code} onChange={e => updateForm('asset_code', e.target.value)} required error={errors.asset_code} />
                        <Select
                            label="Status"
                            options={['planning', 'active', 'maintenance', 'disposed', 'sold'].map(s => ({ value: s, label: s }))}
                            value={form.status}
                            onChange={val => updateForm('status', val)}
                        />
                        <div className="col-span-1 md:col-span-2">
                            <Input label="Asset Name" value={form.name} onChange={e => updateForm('name', e.target.value)} required error={errors.name} />
                        </div>
                        <Select
                            label="Category"
                            options={categoryOptions}
                            value={form.category_id}
                            onChange={val => updateForm('category_id', val)}
                            required
                            error={errors.category_id}
                        />
                        <Select
                            label="Location"
                            options={locations.map(l => ({ value: l.id, label: l.name }))}
                            value={form.location_id}
                            onChange={val => updateForm('location_id', val)}
                        />
                        <Input label="Brand" value={form.brand} onChange={e => updateForm('brand', e.target.value)} />
                        <Input label="Model" value={form.model} onChange={e => updateForm('model', e.target.value)} />
                        <Input
                            label="Department"
                            value={form.department_id}
                            onChange={e => updateForm('department_id', e.target.value)}
                            disabled={!!user?.department && user.role !== 'super_admin'}
                        />
                        <Input label="Serial Number" value={form.serial_number} onChange={e => updateForm('serial_number', e.target.value)} />
                        <NumberInput label="Year Manufacture" value={form.year_manufacture} onChange={val => updateForm('year_manufacture', val)} />
                    </div>
                    <div className="mt-4">
                        <Textarea label="Notes" value={form.notes} onChange={e => updateForm('notes', e.target.value)} />
                    </div>
                </TabsContent>

                <TabsContent value="details">
                    <div className="space-y-4">
                        {isVehicle && (
                            <>
                                <h3 className="text-lg font-medium text-white mb-4">Vehicle Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="License Plate" value={form.vehicle_details.license_plate} onChange={e => updateVehicle('license_plate', e.target.value)} />
                                    <Input label="VIN" value={form.vehicle_details.vin} onChange={e => updateVehicle('vin', e.target.value)} />
                                    <Input label="Engine Number" value={form.vehicle_details.engine_number} onChange={e => updateVehicle('engine_number', e.target.value)} />
                                    <Input label="Color" value={form.vehicle_details.color} onChange={e => updateVehicle('color', e.target.value)} />
                                    <Input label="BPKB Number" value={form.vehicle_details.bpkb_number} onChange={e => updateVehicle('bpkb_number', e.target.value)} />
                                    <NumberInput label="Odometer" value={form.vehicle_details.odometer_last} onChange={val => updateVehicle('odometer_last', val)} />

                                    <DateInput label="STNK Expiry" value={form.vehicle_details.stnk_expiry} onChange={val => updateVehicle('stnk_expiry', val)} />
                                    <DateInput label="KIR Expiry" value={form.vehicle_details.kir_expiry} onChange={val => updateVehicle('kir_expiry', val)} />
                                    <DateInput label="Tax Expiry" value={form.vehicle_details.tax_expiry} onChange={val => updateVehicle('tax_expiry', val)} />

                                    <Select
                                        label="Fuel Type"
                                        options={['Petrol', 'Diesel', 'Electric', 'Hybrid'].map(s => ({ value: s, label: s }))}
                                        value={form.vehicle_details.fuel_type}
                                        onChange={val => updateVehicle('fuel_type', val)}
                                    />
                                    <Select
                                        label="Transmission"
                                        options={['Manual', 'Automatic'].map(s => ({ value: s, label: s }))}
                                        value={form.vehicle_details.transmission}
                                        onChange={val => updateVehicle('transmission', val)}
                                    />
                                    <Input label="Capacity (CC/Ton)" value={form.vehicle_details.capacity} onChange={e => updateVehicle('capacity', e.target.value)} />
                                </div>
                            </>
                        )}

                        {isBuilding && (
                            <>
                                <h3 className="text-lg font-medium text-white mb-4">Property / Land Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-1 md:col-span-2">
                                        <Input label="Address" value={form.building_details.address} onChange={e => updateBuilding('address', e.target.value)} />
                                    </div>
                                    <Input label="City / Region" value={form.building_details.city} onChange={e => updateBuilding('city', e.target.value)} />
                                    <Input label="Certificate Number (SHM/HGB)" value={form.building_details.certificate_number} onChange={e => updateBuilding('certificate_number', e.target.value)} />
                                    <NumberInput label="Land Area (m²)" value={form.building_details.land_area} onChange={val => updateBuilding('land_area', val)} />
                                    <NumberInput label="Building Area (m²)" value={form.building_details.building_area} onChange={val => updateBuilding('building_area', val)} />
                                    <Input label="PBB Number (NOP)" value={form.building_details.pbb_number} onChange={e => updateBuilding('pbb_number', e.target.value)} />
                                    <DateInput label="Certificate Expiry" value={form.building_details.certificate_expiry} onChange={val => updateBuilding('certificate_expiry', val)} />
                                </div>
                            </>
                        )}

                        {!isVehicle && !isBuilding && (
                            <div className="text-center py-10 text-slate-500">
                                No specific details configuration for this category.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="financial">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DateInput label="Purchase Date" value={form.purchase_date} onChange={val => updateForm('purchase_date', val)} />
                        <NumberInput label="Purchase Price" prefix="Rp " value={form.purchase_price} onChange={val => updateForm('purchase_price', val)} />
                        <NumberInput label="Residual Value" prefix="Rp " value={form.residual_value} onChange={val => updateForm('residual_value', val)} />
                        <NumberInput label="Useful Life (Months)" value={form.useful_life_months} onChange={val => updateForm('useful_life_months', val)} />
                    </div>
                </TabsContent>

                <TabsContent value="docs">
                    <div className="text-center py-10 text-slate-500">
                        Document Management will be available after saving.
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={isLoading} leftIcon={<Save size={16} />}>
                    Save Asset
                </Button>
            </div>
        </form>
    );
}
