"use client"

import { Settings, MessageCircle } from 'lucide-react';

export default function MaintenancePage() {
    const handleContactDeveloper = () => {
        window.open('https://wa.me/6208989019049?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20aplikasi%20yang%20sedang%20maintenance', '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center space-y-8">
                
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                        <Settings className="w-8 h-8 text-white animate-spin" style={{animationDuration: '3s'}} />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-light text-gray-900">
                        Sedang Maintenance
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Aplikasi sedang dalam perbaikan
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <div className="text-gray-700 space-y-4 max-w-md mx-auto">
                        <p className="leading-relaxed">
                            Kami sedang melakukan pembaruan sistem untuk meningkatkan kualitas layanan. 
                        </p>
                        <p className="leading-relaxed">
                            Proses ini membutuhkan waktu beberapa saat.
                        </p>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3 max-w-xs mx-auto">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Progress</span>
                            <span>75%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                                className="bg-gray-800 h-1 rounded-full transition-all duration-1000" 
                                style={{width: '75%'}}
                            ></div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="pt-4">
                        <p className="text-gray-600 text-sm mb-4">
                            Butuh bantuan segera?
                        </p>
                        <button
                            onClick={handleContactDeveloper}
                            className="inline-flex items-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Hubungi Developer
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-gray-200">
                    <p className="text-gray-500 text-sm">
                        Terima kasih atas kesabaran Anda
                    </p>
                </div>
            </div>
        </div>
    );
}