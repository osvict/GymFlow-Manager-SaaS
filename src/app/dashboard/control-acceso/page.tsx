"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { UserCheck, UserX, ScanFace, CreditCard, ChevronRight, Fingerprint, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import Webcam from "react-webcam";
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
    const [isScanning, setIsScanning] = useState(false);
    const webcamRef = useRef<any>(null);
    const isProcessingRef = useRef(false);

    // Multimodal
    const [modoBiometrico, setModoBiometrico] = useState<"facial" | "huella">("facial");
    const [isScanningHuella, setIsScanningHuella] = useState(false);

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
                try {
                    // 1. Configurar WebGL como motor principal
                    // @ts-ignore
                    await faceapi.tf.setBackend('webgl');
                } catch (e) {
                    console.warn("WebGL no soportado, usando CPU.");
                    // @ts-ignore
                    await faceapi.tf.setBackend('cpu');
                }

                // 2. Esperar a que el motor reporte que está listo
                // @ts-ignore
                await faceapi.tf.ready();
                // @ts-ignore
                console.log("Backend TF listo:", faceapi.tf.getBackend());

                const MODEL_URL = '/models';
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
            if (!result?.success || !result.socios || result.socios.length === 0) {
                toast.info("No hay socios activos con fotografía en la base de datos para comparar.");
                return;
            }

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
        if (isProcessingRef.current) return;
        if (!isModelLoaded || !faceMatcher || !webcamRef.current || !webcamRef.current.video) return;

        try {
            const videoElement = webcamRef.current.video;
            const detection = await faceapi.detectSingleFace(videoElement).withFaceLandmarks().withFaceDescriptor();

            if (!detection) return; // Salida silenciosa si la red no ve humanos

            // Bloquear el poller tras detectar un humano
            isProcessingRef.current = true;
            setIsScanning(true);

            console.log("2. Rostro detectado, buscando en la base de datos...");

            if (faceMatcher.labeledDescriptors.length === 0) {
                throw new Error("El diccionario de rostros no está cargado o está vacío.");
            }

            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            console.log("3. Resultado del Match:", bestMatch.toString());

            if (bestMatch.label === "unknown" || bestMatch.distance > 0.6) {
                setScanState("denegado");
                setLastTarget({ nombre: "Visita", apellidos: "No Registrada", foto_url: null });
                setMessage("Rostro NO reconocido en el Gimnasio.");
                toast.error("Rostro no reconocido. Distancia: " + bestMatch.distance.toFixed(2));
                playError();
            } else {
                toast.success(`¡Acceso Permitido! Socio: ${bestMatch.label}`);
                executeCheckInCycle(bestMatch.label);
            }
        } catch (error: any) {
            console.error("Error crítico en el escaneo:", error);
            toast.error(error.message || "Hubo un error evaluando los vectores faciales.");
        } finally {
            if (isProcessingRef.current) {
                setTimeout(() => {
                    isProcessingRef.current = false;
                    setIsScanning(false);
                    setScanState("idle");
                    setLastTarget(null);
                    setMessage("");
                }, 4000);
            }
        }
    };

    // Escaneo Automático Continuo (Polling)
    useEffect(() => {
        if (!isModelLoaded || isBuildingMatcher || !faceMatcher || modoBiometrico !== 'facial') return;

        const interval = setInterval(() => {
            escanearRostroActual();
        }, 1500);

        return () => clearInterval(interval);
    }, [isModelLoaded, isBuildingMatcher, faceMatcher, modoBiometrico]);

    const handleLeerHuella = () => {
        if (isProcessingRef.current) return;
        setIsScanningHuella(true);
        isProcessingRef.current = true;

        // Simulación SDK Hardware: "Leyendo puerto serie..."
        setTimeout(async () => {
            setIsScanningHuella(false);
            isProcessingRef.current = false;
            toast.info("Función lista: Aquí se cotejará 'huella_digital' enviando el Template Base64 a Supabase.");

            // TODO: // const resultado = await verificarAccesoHuella(templateFalsoBase64);
            // setScanState("denegado") o "permitido"
        }, 2000);
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

            {/* Botonera Multimodal */}
            <div className="flex gap-4 border-b border-border pb-2">
                <Button
                    variant={modoBiometrico === 'facial' ? 'default' : 'outline'}
                    onClick={() => setModoBiometrico('facial')}
                    className="flex-1 sm:flex-none"
                >
                    <ScanFace className="mr-2 h-4 w-4" /> Inteligencia Facial
                </Button>
                <Button
                    variant={modoBiometrico === 'huella' ? 'default' : 'outline'}
                    onClick={() => setModoBiometrico('huella')}
                    className="flex-1 sm:flex-none"
                >
                    <Fingerprint className="mr-2 h-4 w-4" /> Lector Dactilar USB
                </Button>
            </div>

            {/* Layout Principal Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">

                {/* Panel Izquierdo: Sensor Multimodal */}
                <Card className="flex flex-col h-full overflow-hidden border-2 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            {modoBiometrico === 'facial' ? <ScanFace className="w-5 h-5 text-primary" /> : <Fingerprint className="w-5 h-5 text-primary" />}
                            {modoBiometrico === 'facial' ? 'Gatekeeper Facial' : 'Gatekeeper Dactilar'}
                        </CardTitle>
                        <CardDescription>
                            {modoBiometrico === 'facial' ? 'Posiciona el rostro frente a la cámara web.' : 'Coloque y mantenga el dedo índice sobre el lector de escritorio.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-6 flex-1 gap-6 bg-slate-50/50 dark:bg-slate-900/20 min-h-[400px]">
                        {modoBiometrico === 'facial' ? (
                            <div className="w-full max-w-md aspect-video bg-black rounded-lg border-4 border-dashed border-slate-700 overflow-hidden relative shadow-inner">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                                    mirrored={true}
                                    className="w-full h-full object-cover"
                                />
                                {scanState === "idle" && !isBuildingMatcher && isModelLoaded && !isScanning && (
                                    <>
                                        <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_3px_rgba(34,197,94,0.5)] animate-[scan_3s_ease-in-out_infinite]" />
                                        <div className="absolute top-4 right-4 bg-black/60 text-green-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse backdrop-blur-sm border border-green-500/30">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            Escaneo automático activo...
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full max-w-md aspect-video bg-card rounded-lg border-2 border-dashed border-border shadow-sm">
                                <Fingerprint className={`w-32 h-32 mb-6 ${isScanningHuella ? 'text-primary animate-pulse' : 'text-muted-foreground/30'}`} />
                                <Button size="lg" onClick={handleLeerHuella} disabled={isScanningHuella} className="w-64">
                                    {isScanningHuella ? <><Loader2 className="animate-spin mr-2" /> Leyendo Dispositivo USB...</> : "Activar Escáner"}
                                </Button>
                            </div>
                        )}
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
