// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Keep this! It's essential for dark: to work
    theme: {
        extend: {
            colors: {
                // --- REMOVE ALL YOUR CUSTOM -light and -dark SUFFIXED COLORS HERE ---
                // For example, remove 'bg-primary-light', 'bg-primary-dark', etc.
                // Keep ONLY standard Tailwind colors you might have explicitly defined (like 'black', 'white')
                // if they are not default or you want to redefine them.
                black: '#000000',
                white: '#FFFFFF',
            },
            // Custom grid utility (keep this)
            gridTemplateColumns: {
                'auto-fill-minmax-300': 'repeat(auto-fill, minmax(300px, 1fr))',
            },
            // Custom font family (keep this)
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}