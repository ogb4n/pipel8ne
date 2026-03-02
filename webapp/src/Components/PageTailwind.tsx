import React from 'react';

const PageTailwind: React.FC = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Tailwind CSS</h1>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-teal-600 dark:text-teal-400">Utility-First CSS</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                    Tailwind CSS est un framework CSS "utility-first" qui fournit des classes de bas niveau comme
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1 text-pink-600 dark:text-pink-400">flex</code>,
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1 text-pink-600 dark:text-pink-400">pt-4</code>,
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1 text-pink-600 dark:text-pink-400">text-center</code>
                    et <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1 text-pink-600 dark:text-pink-400">rotate-90</code>
                    qui peuvent être composées pour construire n'importe quel design, directement dans votre balisage.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-teal-600 dark:text-teal-400">Démonstration des utilitaires</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Carte 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-teal-900/20 overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl transition duration-300">
                        <div className="h-32 bg-gradient-to-r from-teal-400 to-blue-500 flex items-center justify-center">
                            <span className="text-white text-4xl font-bold">Flexibilité</span>
                        </div>
                        <div className="p-6">
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Cartes Réactives</h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Cette carte utilise <code className="text-sm bg-gray-100 dark:bg-gray-700 p-0.5 rounded">.rounded-xl</code>,
                                <code className="text-sm bg-gray-100 dark:bg-gray-700 p-0.5 rounded">.shadow-lg</code>, et des dégradés.
                            </p>
                        </div>
                    </div>

                    {/* Carte 2 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-teal-900/20 p-6 border-l-4 border-teal-500 flex items-start space-x-4">
                        <div className="flex-shrink-0">
                            <div className="h-12 w-12 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-white">Mise en page rapide</h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Utilisation de Flexbox pour aligner l'icône et le texte. Tailwind rend cela trivial.
                            </p>
                            <button className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition">
                                Action
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold mb-4 text-teal-600 dark:text-teal-400">Configuration</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Le fichier de configuration <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1">tailwind.config.js</code> permet d'étendre le thème par défaut.
                </p>
                <div className="p-4 bg-slate-800 text-slate-200 rounded-lg font-mono text-sm shadow-inner">
                    <span className="text-purple-400">module</span>.<span className="text-blue-400">exports</span> = {'{'} <br />
                    &nbsp;&nbsp;content: [<span className="text-green-400">"./src/**/*.tsx"</span>], <br />
                    &nbsp;&nbsp;theme: {'{'} <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;extend: {'{'} ... {'}'}, <br />
                    &nbsp;&nbsp;{'}'}, <br />
                    {'}'}
                </div>
            </section>
        </div>
    );
};

export default PageTailwind;
