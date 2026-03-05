"use client";

import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
    onCapture: (imageSrc: string | null) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImgSrc(imageSrc);
            onCapture(imageSrc);
        }
    }, [webcamRef, onCapture]);

    const retake = () => {
        setImgSrc(null);
        onCapture(null);
    };

    return (
        <div className="flex flex-col items-center gap-4 bg-muted/30 p-4 rounded-lg border">
            {imgSrc ? (
                <div className="relative w-full max-w-sm rounded-md overflow-hidden shadow-sm aspect-video">
                    <img src={imgSrc} alt="Fotografía del Socio" className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="relative w-full max-w-sm rounded-md overflow-hidden shadow-sm bg-black aspect-video flex justify-center items-center">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{
                            width: 1280,
                            height: 720,
                            facingMode: "user"
                        }}
                    />
                </div>
            )}

            <div className="flex justify-center w-full">
                {imgSrc ? (
                    <Button type="button" variant="outline" onClick={retake} className="w-full max-w-sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Volver a tomar
                    </Button>
                ) : (
                    <Button type="button" onClick={capture} className="w-full max-w-sm">
                        <Camera className="mr-2 h-4 w-4" />
                        Tomar Fotografía
                    </Button>
                )}
            </div>

            {!imgSrc && (
                <p className="text-xs text-muted-foreground text-center">
                    Permite el acceso a la cámara de tu dispositivo para capturar el rostro.
                </p>
            )}
        </div>
    );
}
