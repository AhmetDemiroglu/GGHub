"use client";

import { useState, useRef, ChangeEvent, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";
import { uploadProfilePhoto } from "@/api/photo/photo.api";
import { getCroppedImg } from "@/core/lib/image-utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Upload } from "lucide-react";
import { Slider } from "@/core/components/ui/slider";
import { getImageUrl } from "@/core/lib/get-image-url";

interface ProfilePhotoUploaderProps {
    isOpen: boolean;
    onClose: () => void;
    currentImageUrl: string | null;
    username: string;
}

export function ProfilePhotoUploader({ isOpen, onClose, currentImageUrl, username }: ProfilePhotoUploaderProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [croppedFile, setCroppedFile] = useState<File | null>(null);

    const avatarSrc = croppedFile ? URL.createObjectURL(croppedFile) : getImageUrl(currentImageUrl ?? undefined);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { mutate, isPending } = useMutation({
        mutationFn: uploadProfilePhoto,
        onSuccess: () => {
            toast.success("Profil fotoğrafı başarıyla güncellendi!");
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            resetAndClose();
        },
        onError: (error) => {
            toast.error("Fotoğraf yüklenirken bir hata oluştu.", { description: error.message });
        },
    });

    const handleFileSelectClick = () => fileInputRef.current?.click();
    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageSrc(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const showCroppedImage = useCallback(async () => {
        if (imageSrc && croppedAreaPixels) {
            const croppedFileResult = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedFileResult) {
                setCroppedFile(croppedFileResult);
                setImageSrc(null);
            }
        }
    }, [imageSrc, croppedAreaPixels]);

    const handleUpload = () => {
        if (croppedFile) {
            mutate(croppedFile);
        }
    };

    const resetAndClose = () => {
        setImageSrc(null);
        setCroppedFile(null);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        onClose();
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) resetAndClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Profil Fotoğrafını Güncelle</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative h-64 w-64">
                        {imageSrc ? (
                            <>
                                <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                                <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2" />
                            </>
                        ) : (
                            <Avatar className="h-full w-full">
                                <AvatarImage src={avatarSrc} alt={username} />
                                <AvatarFallback className="text-6xl">{username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

                    {!imageSrc && (
                        <Button variant="outline" onClick={handleFileSelectClick} className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4 cursor-poin" />
                            {croppedFile ? "Değiştir" : "Yeni Fotoğraf Seç"}
                        </Button>
                    )}

                    {imageSrc && <Button onClick={showCroppedImage}>Kırp ve Önizle</Button>}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={resetAndClose} className="cursor-pointer">
                        İptal
                    </Button>
                    <Button onClick={handleUpload} disabled={!croppedFile || isPending} className="cursor-pointer">
                        {isPending ? "Yükleniyor..." : "Kaydet"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
