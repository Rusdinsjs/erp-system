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
        <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general" icon={<Info size={14} />}>General</TabsTrigger>
                    <TabsTrigger
                        value="details"
                        icon={isVehicle ? <Car size={14} /> : isBuilding ? <Building2 size={14} /> : <FileText size={14} />}
                    >
                        {isVehicle ? 'Vehicle Details' : isBuilding ? 'Property Details' : 'Specifications'}
                    </TabsTrigger>
                    <TabsTrigger value="financial" icon={<DollarSign size={14} />}>Financial</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Asset Code"
                            value={formData.asset_code}
                            onChange={(e) => updateField('asset_code', e.target.value)}
                            error={errors.asset_code}
                            required
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
                        {/* Is Rental Checkbox */}
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <input
                                type="checkbox"
                                id="is_rental"
                                checked={formData.is_rental}
                                onChange={(e) => updateField('is_rental', e.target.checked)}
                                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <label htmlFor="is_rental" className="text-sm text-slate-300 cursor-pointer">
                                <span className="font-medium text-white">Is Rentable</span>
                                <span className="block text-xs text-slate-500">Centang jika asset ini bisa disewakan</span>
                            </label>
                        </div>
                        <div className="md:col-span-2">
                            <Input
                                label="Asset Name"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                error={errors.name}
                                required
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
                        <Input
                            label="Brand"
                            value={formData.brand}
                            onChange={(e) => updateField('brand', e.target.value)}
                        />
                        <Input
                            label="Model"
                            value={formData.model}
                            onChange={(e) => updateField('model', e.target.value)}
                        />
                        <Select
                            label="Department"
                            value={formData.department_id}
                            onChange={(val) => updateField('department_id', val)}
                            options={departmentOptions}
                            placeholder="Select department..."
                            onCreate={() => window.open('/departments', '_blank')}
                            disabled={!!user?.department && user.role !== 'super_admin'}
                        />
                        <Input
                            label="Serial Number"
                            value={formData.serial_number}
                            onChange={(e) => updateField('serial_number', e.target.value)}
                        />
                        <NumberInput
                            label="Year Manufacture"
                            value={formData.year_manufacture}
                            onChange={(val) => updateField('year_manufacture', val)}
                        />
                    </div>
                    <div className="mt-4">
                        <Textarea
                            label="Notes"
                            value={formData.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            rows={3}
                        />
                    </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details">
                    {isVehicle && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Vehicle Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="License Plate (No Polisi)"
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
                                    label="Odometer"
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
                                    placeholder="Select fuel type..."
                                />
                                <Select
                                    label="Transmission"
                                    value={formData.vehicle_transmission}
                                    onChange={(val) => updateField('vehicle_transmission', val)}
                                    options={[
                                        { value: 'Manual', label: 'Manual' },
                                        { value: 'Automatic', label: 'Automatic' },
                                    ]}
                                    placeholder="Select transmission..."
                                />
                                <Input
                                    label="Capacity (CC/Ton)"
                                    value={formData.vehicle_capacity}
                                    onChange={(e) => updateField('vehicle_capacity', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {isBuilding && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Property / Land Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    )}

                    {!isVehicle && !isBuilding && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                <h3 className="text-lg font-semibold text-white">Custom Specifications</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={addSpec}
                                    leftIcon={<Plus size={14} />}
                                >
                                    Add Attribute
                                </Button>
                            </div>

                            {customSpecs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-500 bg-slate-900/30 rounded-lg border border-dashed border-slate-800">
                                    <FileText size={32} className="mb-2 opacity-50" />
                                    <p>No specific attributes defined.</p>
                                    <p className="text-xs">Click "Add Attribute" to add custom details (e.g., Color, Weight, RAM).</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {customSpecs.map((spec, index) => (
                                    <div key={index} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Attribute Name (e.g. Color)"
                                                value={spec.key}
                                                onChange={(e) => updateSpec(index, 'key', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Value (e.g. Red)"
                                                value={spec.value}
                                                onChange={(e) => updateSpec(index, 'value', e.target.value)}
                                            />
                                        </div>
                                        <ActionIcon
                                            variant="danger"
                                            className="mt-1"
                                            type="button"
                                            onClick={() => removeSpec(index)}
                                            title="Remove attribute"
                                        >
                                            <Trash2 size={16} />
                                        </ActionIcon>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Financial Tab */}
                <TabsContent value="financial">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="outline" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" loading={isLoading} leftIcon={<Save size={16} />}>
                    Save Asset
                </Button>
            </div>

            {/* Quick Create Category Modal */}
            <CreateCategoryModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSuccess={(newId) => {
                    updateField('category_id', newId);
                    // Optionally refresh categories query if needed, 
                    // generally invalidating 'categories-tree' or 'departments' handled in mutation
                }}
            />
        </form>
    );
}


