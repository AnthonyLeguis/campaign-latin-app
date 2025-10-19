import { useNavigate } from 'react-router-dom'
import { PointingHand } from '../components/PointingHand'

export const View1 = () => {
    const navigate = useNavigate();

    return (
        <div className="text-center">
            {/* Benefits Section con Checkpoints */}
            <div className="mb-8 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border-l-4 border-green-500">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-white text-sm font-semibold text-left">
                        Protege tu familia con un programa de bajo costo.
                    </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border-l-4 border-green-500">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-white text-sm font-semibold text-left">
                        Sin requerimiento de examen médico.
                    </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border-l-4 border-green-500">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-white text-sm font-semibold text-left">
                        No importa tu estatus migratorio.
                    </p>
                </div>
            </div>

            <div className="relative mt-6 inline-block w-full">
                <div className="mb-2 text-gray-950 font-medium flex flex-row items-center justify-center">
                    {/* icono de flecha hacia abajo */}
                    <span className="text-xl animate-bounce">⬇</span>
                    <p className='pb-2'>¡Haz click aquí debajo para calificar!</p>
                    <span className="text-xl animate-bounce">⬇</span>
                </div>
                <button
                    onClick={() => navigate("/view2")}
                    className="w-full bg-[#084f63] text-white py-2 rounded-md text-lg font-bold shadow -tracking-tighter hover:bg-[#0a5f77] transition-colors cursor-pointer flex items-center justify-center gap-2 pl-6"
                >
                    <span>
                        ¡Califica aquí!
                    </span>
                    <PointingHand />
                </button>
            </div>

            <div className="mt-4">
                <img src="/images/congress.jpg" alt="imagen referencial" className="w-full rounded" />
            </div>
        </div>
    )
}
