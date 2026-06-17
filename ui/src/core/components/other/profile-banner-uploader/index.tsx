"use client";

import { useState, useRef, ChangeEvent, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";
import { uploadHeaderPhoto } from "@/api/photo/photo.api";
import { getCroppedImg } from "@/core/lib/image-utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { ImagePlus, Upload, ZoomIn } from "lucide-react";
import { Slider } from "@/core/components/ui/slider";
import { useI18n } from "@/core/contexts/locale-context";

interface ProfileBannerUploaderProps {
    isOpen: boolean;
    onClose: () => void;
}

const ASPECT = 3; // X-stili geniş banner

export function ProfileBannerUploader({ isOpen, onClose }: ProfileBannerUploaderProps) {
    const t = useI18n();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const zoomFrameRef = useRef<number | null>(null);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [croppedFile, setCroppedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!imageSrc?.startsWith("blob:")) return;
        return () => URL.revokeObjectURL(imageSrc);
    }, [imageSrc]);

    useEffect(() => {
        if (!croppedFile) {
            setPreviewUrl(null);
            return;
        }

        const nextPreviewUrl = URL.createObjectURL(croppedFile);
        setPreviewUrl(nextPreviewUrl);

        return () => URL.revokeObjectURL(nextPreviewUrl);
    }, [croppedFile]);

    useEffect(() => {
        return () => {
            if (zoomFrameRef.current !== null) {
                cancelAnimationFrame(zoomFrameRef.current);
            }
        };
    }, []);

    const { mutate, isPending } = useMutation({
        mutationFn: uploadHeaderPhoto,
        onSuccess: () => {
            toast.success(t("profile.header.coverUpdateSuccess"));
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            resetAndClose();
        },
        onError: (error) => {
            toast.error(t("profile.header.coverUpdateError"), { description: error.message });
        },
    });

    const handleFileSelectClick = () => fileInputRef.current?.click();

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleZoomChange = useCallback((nextZoom: number) => {
        if (zoomFrameRef.current !== null) {
            cancelAnimationFrame(zoomFrameRef.current);
        }

        zoomFrameRef.current = requestAnimationFrame(() => {
            setZoom(nextZoom);
            zoomFrameRef.current = null;
        });
    }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setCroppedFile(null);
        setCroppedAreaPixels(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setImageSrc(URL.createObjectURL(file));
        event.target.value = "";
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
        setCroppedAreaPixels(null);
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
            <DialogContent size="xl" className="flex max-h-[92vh] flex-col overflow-hidden p-0">
                <DialogHeader className="shrink-0 px-6 pt-6">
                    <DialogTitle>{t("profile.header.updateCoverTitle")}</DialogTitle>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto overflow-x-hidden px-6 py-4">
                    <div className="relative h-[clamp(220px,42vh,360px)] w-full max-w-full overflow-hidden rounded-md bg-secondary/30">
                        {imageSrc ? (
                            <>
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={ASPECT}
                                    cropShape="rect"
                                    onCropChange={setCrop}
                                    onZoomChange={handleZoomChange}
                                    onCropComplete={onCropComplete}
                                    restrictPosition
                                    zoomSpeed={0.7}
                                    objectFit="horizontal-cover"
                                />
                                <div className="absolute bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-background/85 px-4 py-3 shadow-lg backdrop-blur">
                                    <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <Slider
                                        value={[zoom]}
                                        min={1}
                                        max={3}
                                        step={0.05}
                                        onValueChange={(value) => handleZoomChange(value[0])}
                                        className="flex-1"
                                    />
                                </div>
                            </>
                        ) : previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt={t("profile.header.coverPreviewAlt")} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                                <ImagePlus className="h-8 w-8" />
                                <span>{t("profile.header.coverPickerHint")}</span>
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
                            {croppedFile ? t("profile.header.changeCoverImage") : t("profile.header.chooseCoverImage")}
                        </Button>
                    )}
                </div>

                <DialogFooter className="shrink-0 border-t px-6 py-4">
                    <Button variant="ghost" onClick={resetAndClose} className="cursor-pointer">
                        {t("common.cancel")}
                    </Button>
                    {imageSrc ? (
                        <Button onClick={showCroppedImage} disabled={!croppedAreaPixels} className="cursor-pointer">
                            {t("profile.header.cropAndPreview")}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleUpload}
                            disabled={!croppedFile || isPending}
                            className="cursor-pointer"
                        >
                            {isPending ? t("profile.header.uploadingCover") : t("common.save")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
