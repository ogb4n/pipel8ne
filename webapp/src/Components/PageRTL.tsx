import React, { useState } from 'react';

const PageRTL: React.FC = () => {
    const [count, setCount] = useState(0);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">React Testing Library (RTL)</h1>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-700 dark:text-purple-400">Qu'est-ce que c'est ?</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                    React Testing Library est une bibliothèque de test légère qui encourage les bonnes pratiques de test en testant vos composants
                    de la manière dont l'utilisateur les utilise, plutôt que de tester les détails d'implémentation.
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md border-l-4 border-purple-500">
                    <p className="italic text-gray-800 dark:text-gray-200">"The more your tests resemble the way your software is used, the more confidence they can give you."</p>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-700 dark:text-purple-400">Exemple interactif</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                    Voici un composant simple (compteur) que nous pourrions tester. RTL nous permettrait de cliquer sur le bouton et de vérifier
                    que le texte change.
                </p>

                <div className="border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm bg-white dark:bg-gray-800">
                    <p className="mb-4 text-lg text-gray-900 dark:text-gray-100">Le compteur est à : <span data-testid="count-value" className="font-bold">{count}</span></p>
                    <button
                        onClick={() => setCount(c => c + 1)}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                    >
                        Incrémenter
                    </button>
                    <button
                        onClick={() => setCount(0)}
                        className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        Réinitialiser
                    </button>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-700 dark:text-purple-400">Exemple de Test</h2>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <pre>
                        {`import { render, screen, fireEvent } from '@testing-library/react';
import PageRTL from './PageRTL';

test('incrémente le compteur quand on clique sur le bouton', () => {
  render(<PageRTL />);
  
  // Vérifie l'état initial
  const countValue = screen.getByTestId('count-value');
  expect(countValue).toHaveTextContent('0');
  
  // Trouve le bouton et clique dessus
  const button = screen.getByText('Incrémenter');
  fireEvent.click(button);
  
  // Vérifie le nouvel état
  expect(countValue).toHaveTextContent('1');
});`}
                    </pre>
                </div>
            </section>
        </div>
    );
};

export default PageRTL;
