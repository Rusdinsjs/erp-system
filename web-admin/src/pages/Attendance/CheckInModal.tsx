import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { showToast } from '../../components/ui/Toast';
import { MapPin, Camera } from 'lucide-react';

interface CheckInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { latitude: number; longitude: number; notes: string; photo_url: string }) => void;
    type: 'check-in' | 'check-out';
    isLoading: boolean;
}

export const CheckInModal = ({ isOpen, onClose, onConfirm, type, isLoading }: CheckInModalProps) => {
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getLocation();
            setNotes('');
        }
    }, [isOpen]);

    const getLocation = () => {
        setLocating(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLocating(false);
            },
            (error) => {
                let msg = 'Unable to retrieve your location';
                if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied';
                else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location unavailable';
                else if (error.code === error.TIMEOUT) msg = 'Location request timed out';

                setLocationError(msg);
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSubmit = () => {
        if (!location) {
            showToast('Location is required', 'error');
            return;
        }
        // In a real app, we would handle camera/photo here using a file input or camera API
        // For now we simulate a photo URL
        const mockPhotoUrl = "https://ui-avatars.com/api/?name=User&background=random";

        onConfirm({
            latitude: location.lat,
            longitude: location.lng,
            notes,
            photo_url: mockPhotoUrl
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'check-in' ? 'Check In Attendance' : 'Check Out Attendance'}
        >
            <div className="space-y-4">
                {/* Location Status */}
                <div className={`p-4 rounded-lg flex items-center justify-between ${location ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                    }`}>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <span className="text-sm font-medium">
                            {locating ? 'Getting location...' :
                                location ? `Location aquired (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` :
                                    locationError || 'Location required'}
                        </span>
                    </div>
                    {(!location && !locating) && (
                        <Button variant="outline" size="sm" onClick={getLocation}>Retry</Button>
                    )}
                </div>

                {/* Photo Placeholder */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <Camera className="h-8 w-8 mb-2" />
                    <span className="text-xs">Take Photo (Simulated)</span>
                </div>

                <Textarea
                    label="Notes (Optional)"
                    placeholder="Working from office..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!location || isLoading || locating}
                        loading={isLoading}
                        variant={type === 'check-in' ? 'primary' : 'danger'}
                    >
                        {type === 'check-in' ? 'Confirm Check In' : 'Confirm Check Out'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
