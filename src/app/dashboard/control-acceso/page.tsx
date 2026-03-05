"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { UserCheck, UserX, ScanFace, CreditCard, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import CameraCapture from "@/components/CameraCapture";
import * as faceapi from '@vladmandic/face-api';
// We import the new action
import { verificarAccesoCedula, obtenerSociosParaBiometria } from "@/app/actions/acceso-actions";

export default function ControlAcceso() {
    const [isPending, startTransition] = useTransition();
    const [scanState, setScanState] = useState<"idle" | "permitido" | "denegado">("idle");
    const [lastTarget, setLastTarget] = useState<any>(null);
    const [message, setMessage] = useState<string>("");

    // IA Biometrics
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [isBuildingMatcher, setIsBuildingMatcher] = useState(false);
    const webcamRef = useRef<any>(null);

    // Beep Audios (Base64 short sounds to avoid latency fetching from public)
    const audioSuccess = useRef<HTMLAudioElement | null>(null);
    const audioError = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Init sounds on client side
        audioSuccess.current = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"); // Short placeholder for success
        audioError.current = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"); // Short placeholder for error

        // Init Models Async
        const loadModels = async () => {
            try {
                if (typeof window !== 'undefined') {
                    faceapi.env.monkeyPatch({
                        Canvas: HTMLCanvasElement,
                        Image: HTMLImageElement,
                        Video: HTMLVideoElement
                    });
                }
                const MODEL_URL = '/models';

                // 1. Configurar WebGL como motor principal
                // @ts-ignore
                await faceapi.tf.setBackend('webgl');
                // 2. Esperar a que el motor reporte que está listo
                // @ts-ignore
                await faceapi.tf.ready();

                // Ahora sí, carga los modelos...
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelLoaded(true);
                buildMatcher();
            } catch (error: any) {
                console.error("Error detallado IA:", error);
                toast.error(error.message || "Error al cargar los modelos de IA facial. Inténtelo más tarde.");
                setScanState("denegado");
                setMessage("Error en modelos IA");
            }
        };

        loadModels();
    }, []);

    const buildMatcher = async () => {
        setIsBuildingMatcher(true);
        try {
            const result = await obtenerSociosParaBiometria();
            if (!result?.success || !result.socios) return;

            const labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];

            for (const socio of result.socios) {
                if (!socio.foto_url) continue;

                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous'; // CRITICAL FOR SUPABASE STORAGE CORS
                    img.src = socio.foto_url;

                    // Promisify Image Load
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });

                    // Extracción profunda del tensor descriptor
                    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

                    if (detection) {
                        // El Label es la cédula o el ID interno entero de la DB. Usaremos Cédula para reciclar el log manual.
                        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(socio.cedula, [detection.descriptor]));
                    }
                } catch (imgError) {
                    console.error("No se pudo extraer el tensor de un socio:", socio.cedula, imgError);
                }
            }

            if (labeledDescriptors.length > 0) {
                const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 Strictness Confidence
                setFaceMatcher(matcher);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsBuildingMatcher(false);
        }
    };

    const playSuccess = () => audioSuccess.current?.play().catch(() => { });
    const playError = () => audioError.current?.play().catch(() => { });

    // Focus input automatically after scan for fast keyboard mapping
    const inputRef = useRef<HTMLInputElement>(null);

    const executeCheckInCycle = (cedula: string) => {
        startTransition(async () => {
            const result = await verificarAccesoCedula(cedula);

            setLastTarget(result?.socio || { nombre: "Desconocido", apellidos: "", cedula });

            if (result?.error) {
                // Critical system failure or offline
                toast.error(result.error);
                setScanState("denegado");
                setMessage("Falla de Conexión o Permisos");
                playError();
            } else {
                if (result?.acceso_concedido) {
                    setScanState("permitido");
                    setMessage("Acceso Autorizado");
                    playSuccess();
                } else {
                    setScanState("denegado");
                    setMessage(result?.mensaje || "Acceso Denegado");
                    playError();
                }
            }

            // Reset input for the next person in line
            if (inputRef.current) {
                inputRef.current.value = "";
                inputRef.current.focus();
            }

            // Auto reset UI after 5 seconds
            setTimeout(() => {
                setScanState("idle");
                setLastTarget(null);
                setMessage("");
            }, 5000);
        });
    };

    const onManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const cedulaObj = new FormData(e.currentTarget);
        const cedula = cedulaObj.get("cedula") as string;

        if (!cedula) return;

        // LLAMADA FINAL DEL BOTON VERIFICAR (MANUAL)
        executeCheckInCycle(cedula);
    };

    const escanearRostroActual = async () => {
        if (!isModelLoaded || !faceMatcher || !webcamRef.current) {
            toast.warning("Los modelos neuronales siguen cargando o no hay webcams...");
            return;
        }

        try {
            const videoElement = webcamRef.current.video;
            if (!videoElement) return;

            toast.info("Analizando mapa facial, no se mueva...");

            const detection = await faceapi.detectSingleFace(videoElement).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                setScanState("denegado");
                setLastTarget({ nombre: "Misterio", apellidos: "?", foto_url: null });
                setMessage("Rostro no detectado / Muévase a la luz");
                playError();
                return;
            }

            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            if (bestMatch.label === "unknown") {
                setScanState("denegado");
                setLastTarget({ nombre: "Visita", apellidos: "No Registrada", foto_url: null });
                setMessage("Rostro NO reconocido en el Gimnasio.");
                playError();
            } else {
                // bestMatch.label = Cédula almacenada del Socio
                executeCheckInCycle(bestMatch.label);
            }
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Hubo un error evaluando los vectores faciales.");
        }
    };

    return (
        <div className="flex flex-col h-full gap-6 max-w-[1600px] mx-auto overflow-hidden">
            {/* Cabecera */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Terminal de Control de Acceso</h1>
                    <p className="text-muted-foreground mt-1">Verificación física y biométrica para el ingreso al club.</p>
                </div>
                <div className="hidden md:flex gap-2">
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Terminal En Línea</Badge>
                </div>
            </div>

            {/* Layout Principal Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">

                {/* Panel Izquierdo: Biometría Facial */}
                <Card className="flex flex-col h-full overflow-hidden border-2 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <ScanFace className="w-5 h-5 text-primary" />
                            Gatekeeper Facial
                        </CardTitle>
                        <CardDescription>
                            Posiciona el rostro frente a la cámara web.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-6 flex-1 gap-6 bg-slate-50/50 dark:bg-slate-900/20">
                        {/* Placeholder Visual o Feed Real */}
                        <div className="w-full max-w-md aspect-video bg-black rounded-lg border-4 border-dashed border-slate-700 overflow-hidden relative shadow-inner">
                            <video
                                ref={(ref) => {
                                    if (ref) {
                                        webcamRef.current = { video: ref };
                                        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
                                            ref.srcObject = stream;
                                            ref.play();
                                        });
                                    }
                                }}
                                className="w-full h-full object-cover"
                                autoPlay
                                playsInline
                                muted
                            />
                            {/* Scanning Laser Line Effect */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_3px_rgba(34,197,94,0.5)] animate-[scan_3s_ease-in-out_infinite]" />
                        </div>
                        <Button
                            className="w-full max-w-md h-16 text-lg font-bold uppercase tracking-wider relative overflow-hidden"
                            onClick={escanearRostroActual}
                            disabled={!isModelLoaded || isBuildingMatcher}
                        >
                            <ScanFace className="mr-3 w-6 h-6" />
                            {isBuildingMatcher ? "Calculando Matrices Locales..." : !isModelLoaded ? "Cargando IA..." : "Escanear Rostro"}

                            {(isBuildingMatcher || !isModelLoaded) && (
                                <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Panel Derecho: Manual Cédula e Interfaz de Feedback */}
                <div className="flex flex-col gap-6">
                    {/* Tarjeta de Ingreso Cédula */}
                    <Card className="border-2 shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Digitación Manual o Radiofrecuencia
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={onManualSubmit} className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 flex flex-col gap-2">
                                    <Label htmlFor="cedula" className="sr-only">Cédula del Socio</Label>
                                    <Input
                                        id="cedula"
                                        name="cedula"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="Ingrese N° de Cédula"
                                        className="h-16 text-2xl font-mono text-center tracking-widest"
                                        required
                                        autoFocus
                                        ref={inputRef}
                                        disabled={isPending}
                                        onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, ''); }}
                                    />
                                </div>
                                <Button type="submit" className="h-16 px-8 text-lg font-bold" disabled={isPending}>
                                    <ChevronRight className="w-6 h-6 mr-2" />
                                    Verificar
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tarjeta de Feedback Masivo (Giant Alert) */}
                    <Card className={`flex-1 flex flex-col border-4 overflow-hidden transition-colors duration-500 shadow-lg ${scanState === "permitido" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" :
                        scanState === "denegado" ? "border-red-500 bg-red-50 dark:bg-red-950/30" :
                            "border-slate-200 dark:border-slate-800 bg-card"
                        }`}>
                        <CardContent className="flex-1 flex flex-col lg:flex-row items-center justify-center p-8 lg:p-12 gap-8 text-center lg:text-left">
                            {scanState === "idle" ? (
                                <div className="flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                                    <UserCheck className="w-24 h-24" />
                                    <p className="text-xl font-medium">Esperando al próximo socio...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Avatar/Foto de la persona escaneada */}
                                    <Avatar className={`w-40 h-40 lg:w-48 lg:h-48 border-8 shadow-xl transition-transform duration-300 scale-in-center ${scanState === "permitido" ? "border-emerald-500" : "border-red-500"
                                        }`}>
                                        {lastTarget?.foto_url && (
                                            <AvatarImage src={lastTarget.foto_url} alt="Foto Socio" className="object-cover" />
                                        )}
                                        <AvatarFallback className="text-4xl bg-background text-foreground font-bold uppercase">
                                            {lastTarget?.nombre?.charAt(0) || "?"}{lastTarget?.apellidos?.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Resultado de la evaluación */}
                                    <div className="flex flex-col items-center lg:items-start space-y-3 flex-1 min-w-0">
                                        <Badge
                                            className={`text-sm lg:text-base px-4 py-1.5 font-bold uppercase tracking-wider ${scanState === "permitido" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                                                }`}
                                        >
                                            {scanState === "permitido" ? "ACCESO PERMITIDO" : "ACCESO DENEGADO"}
                                        </Badge>

                                        <h2 className={`text-4xl lg:text-5xl font-black truncate w-full tracking-tight ${scanState === "permitido" ? "text-emerald-800 dark:text-emerald-400" : "text-red-800 dark:text-red-400"
                                            }`}>
                                            {lastTarget?.nombre} {lastTarget?.apellidos}
                                        </h2>

                                        <div className="flex items-center gap-2 mt-2">
                                            {scanState === "denegado" ? (
                                                <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                                            ) : (
                                                <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                            )}
                                            <p className={`text-xl lg:text-2xl font-semibold opacity-90 ${scanState === "permitido" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                                                }`}>
                                                {message}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Animación Keyframes CSS Inyectada */}
            <style jsx global>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(350px); }
                }
                .scale-in-center {
                    animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

function Badge({ children, variant = "default", className = "", ...props }: any) {
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>
            {children}
        </div>
    )
}
