// Locations Page - Pure Tailwind
import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { locationApi, type Location } from '../api/locations';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Input,
    Select,
    NumberInput,
    LoadingOverlay,
    useToast,
} from '../components/ui';

const initialFormState = {
    code: '',
    name: '',
    location_type: 'other',
    address: '',
    parent_id: null as string | null,
    capacity: undefined as number | undefined,
};

export function Locations() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [formData, setFormData] = useState(initialFormState);

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await locationApi.list();
            setLocations(data);
        } catch (error) {
            console.error(error);
            showError('Failed to load locations', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await locationApi.create(formData);
            success('Location created', 'Success');
            setModalOpen(false);
            setFormData(initialFormState);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to create location', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingLocation) return;
        setSubmitting(true);
        try {
            await locationApi.update(editingLocation.id, formData);
            success('Location updated', 'Success');
            setModalOpen(false);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to update location', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (location: Location) => {
        if (!window.confirm(`Are you sure you want to delete ${location.name}?`)) return;
        try {
            await locationApi.delete(location.id);
            success('Location deleted', 'Success');
            loadData();
        } catch (e: any) {
            showError('Failed to delete location', 'Error');
        }
    };

    const openCreateModal = () => {
        setFormData(initialFormState);
        setEditingLocation(null);
        setIsEditing(false);
        setModalOpen(true);
    };

    const openEditModal = (location: Location) => {
        setEditingLocation(location);
        setIsEditing(true);
        setFormData({
            code: location.code,
            name: location.name,
            location_type: location.location_type || 'other',
            address: location.address || '',
            parent_id: location.parent_id || null,
            capacity: location.capacity || undefined,
        });
        setModalOpen(true);
    };

    const getTypeBadge = (type: string): 'info' | 'success' | 'warning' | 'default' => {
        switch (type.toLowerCase()) {
            case 'building':
            case 'city': return 'info';
            case 'floor':
            case 'room': return 'success';
            case 'rack':
            case 'zone': return 'warning';
            default: return 'default';
        }
    };

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
    );

    const parentOptions = locations
        .filter(l => !editingLocation || l.id !== editingLocation.id)
        .map(l => ({ value: l.id, label: `${l.name} (${l.code})` }));

    const getParentName = (parentId?: string | null) => {
        if (!parentId) return '-';
        return locations.find(l => l.id === parentId)?.name || 'Unknown';
    };

    const typeOptions = [
        { value: 'building', label: 'Building' },
        { value: 'floor', label: 'Floor' },
        { value: 'room', label: 'Room' },
        { value: 'rack', label: 'Rack' },
        { value: 'zone', label: 'Zone' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Locations</h1>
                <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>
                    Add Location
                </Button>
            </div>

            <Card padding="lg">
                {/* Search */}
                <div className="mb-4">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="relative">
                    <LoadingOverlay visible={loading} />
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Name / Code</TableTh>
                                <TableTh>Type</TableTh>
                                <TableTh>Parent Location</TableTh>
                                <TableTh>Address</TableTh>
                                <TableTh>Capacity</TableTh>
                                <TableTh align="center">Actions</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLocations.length > 0 ? filteredLocations.map((location) => (
                                <TableRow key={location.id}>
                                    <TableTd>
                                        <div>
                                            <p className="font-medium text-white">{location.name}</p>
                                            <p className="text-xs text-slate-500">{location.code}</p>
                                        </div>
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant={getTypeBadge(location.location_type)}>
                                            {location.location_type}
                                        </Badge>
                                    </TableTd>
                                    <TableTd>{getParentName(location.parent_id)}</TableTd>
                                    <TableTd>{location.address || '-'}</TableTd>
                                    <TableTd>{location.capacity ? location.capacity : 'Unlimited'}</TableTd>
                                    <TableTd align="center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ActionIcon onClick={() => openEditModal(location)} title="Edit">
                                                <Edit size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="danger" onClick={() => handleDelete(location)} title="Delete">
                                                <Trash2 size={16} />
                                            </ActionIcon>
                                        </div>
                                    </TableTd>
                                </TableRow>
                            )) : (
                                <TableEmpty colSpan={6} message="No locations found" />
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={isEditing ? "Edit Location" : "Add Location"}
            >
                <div className="space-y-4">
                    <Input
                        label="Code"
                        placeholder="e.g. BLD-01"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                    />
                    <Input
                        label="Name"
                        placeholder="e.g. Main Building"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Type"
                        value={formData.location_type}
                        onChange={(val) => setFormData({ ...formData, location_type: val || 'other' })}
                        options={typeOptions}
                        required
                    />
                    <Select
                        label="Parent Location"
                        placeholder="Select parent (optional)"
                        value={formData.parent_id || ''}
                        onChange={(val) => setFormData({ ...formData, parent_id: val || null })}
                        options={parentOptions}
                    />
                    <Input
                        label="Address"
                        placeholder="Optional address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <NumberInput
                        label="Capacity"
                        hint="Max items (optional)"
                        value={formData.capacity}
                        onChange={(val) => setFormData({ ...formData, capacity: val })}
                    />
                    <Button fullWidth onClick={isEditing ? handleUpdate : handleCreate} loading={submitting}>
                        {isEditing ? "Update" : "Save"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
