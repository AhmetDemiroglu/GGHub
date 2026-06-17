"use client";

import { useState, useRef, ChangeEvent, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";
import { uploadHeaderPhoto } from "@/api/photo/photo.api";
import { getCroppedImg } from "@/core/lib/image-utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Upload } from "lucide-react";
import { Slider } from "@/core/components/ui/slider";

interface ProfileBannerUploaderProps {
    isOpen: boolean;
    onClose: () => void;
}

const ASPECT = 3; // X-stili geniş banner

export function ProfileBannerUploader({ isOpen, onClose }: ProfileBannerUploaderProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [croppedFile, setCroppedFile] = useState<File | null>(null);
    const previewUrl = croppedFile ? URL.createObjectURL(croppedFile) : null;

    const { mutate, isPending } = useMutation({
        mutationFn: uploadHeaderPhoto,
        onSuccess: () => {
            toast.success("Profil banner'ı güncellendi.");
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            resetAndClose();
        },
        onError: (error) => {
            toast.error("Banner yüklenemedi.", { description: error.message });
        },
    });

    const handleFileSelectClick = () => fileInputRef.current?.click();
    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImageSrc(reader.result as string);
        reader.readAsDataURL(file);
    };

    const showCroppedImage = useCallback(async () => {
        if (imageSrc && croppedAreaPixels) {
            const result = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (result) {
                setCroppedFile(result);
                setImageSrc(null);
            }
        }
    }, [imageSrc, croppedAreaPixels]);

    const handleUpload = () => {
        if (croppedFile) mutate(croppedFile);
    };

    const resetAndClose = () => {
        setImageSrc(null);
        setCroppedFile(null);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) resetAndClose();
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Profil banner'ını güncelle</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative h-56 w-full overflow-hidden rounded-md bg-secondary/30">
                        {imageSrc ? (
                            <>
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={ASPECT}
                                    cropShape="rect"
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                                <Slider
                                    value={[zoom]}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onValueChange={(value) => setZoom(value[0])}
                                    className="absolute bottom-4 left-1/2 w-1/2 -translate-x-1/2"
                                />
                            </>
                        ) : previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt="Banner önizleme" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                Banner için bir görsel seç (3:1 önerilir)
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />

                    {!imageSrc && (
                        <Button variant="outline" onClick={handleFileSelectClick} className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            {croppedFile ? "Değiştir" : "Görsel seç"}
                        </Button>
                    )}

                    {imageSrc && <Button onClick={showCroppedImage}>Kırp ve önizle</Button>}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={resetAndClose} className="cursor-pointer">
                        İptal
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!croppedFile || isPending}
                        className="cursor-pointer"
                    >
                        {isPending ? "Yükleniyor..." : "Kaydet"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
