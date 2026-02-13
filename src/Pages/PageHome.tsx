import React from 'react';

const PageHome: React.FC = () => {
    return (
        <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Bienvenue sur l'Application de Démo</h1>
            <p className="text-lg text-gray-600">
                Ce projet sert de démonstration pour l'intégration de React, TypeScript, Vite, Tailwind CSS et React Testing Library.
            </p>
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-100">
                <h2 className="text-2xl font-semibold text-blue-800 mb-2">Composants disponibles</h2>
                <ul className="list-disc list-inside text-blue-700">
                    <li>Page d'accueil (vous êtes ici)</li>
                    <li>Démonstration de React Testing Library</li>
                    <li>Explication de Tailwind CSS</li>
                </ul>
            </div>
        </div>
    );
};

export default PageHome;
