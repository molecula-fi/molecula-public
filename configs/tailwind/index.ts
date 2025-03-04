import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        screens: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
            blog: '75rem',
        },
        extend: {
            fontFamily: {
                sans: ['var(--font-alt-molecula)'],
            },
            fontSize: {
                'body-xxs': [
                    '0.625rem',
                    {
                        lineHeight: '145%',
                        letterSpacing: '0em',
                    },
                ],
                'body-xs': [
                    '0.75rem',
                    {
                        lineHeight: '145%',
                        letterSpacing: '0em',
                    },
                ],
                'body-sm': [
                    '0.875rem',
                    {
                        lineHeight: '145%',
                        letterSpacing: '0em',
                    },
                ],
                body: [
                    '1rem',
                    {
                        lineHeight: '145%',
                        letterSpacing: '0em',
                    },
                ],
                heading6: [
                    '1.125rem',
                    {
                        lineHeight: '135%',
                        letterSpacing: '0em',
                    },
                ],
                heading5: [
                    '1.25rem',
                    {
                        lineHeight: '135%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                heading4: [
                    '1.5rem',
                    {
                        lineHeight: '135%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                heading3: [
                    '1.75rem',
                    {
                        lineHeight: '135%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                heading2: [
                    '2rem',
                    {
                        lineHeight: '135%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                heading1: [
                    '2.5rem',
                    {
                        lineHeight: '135%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                display6: [
                    '3rem',
                    {
                        lineHeight: '105%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                display5: [
                    '3.5rem',
                    {
                        lineHeight: '100%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                display4: [
                    '4.5rem',
                    {
                        lineHeight: '100%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                display3: [
                    '5rem',
                    {
                        lineHeight: '100%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                display2: [
                    '6rem',
                    {
                        lineHeight: '100%',
                        letterSpacing: '-0.03rem',
                    },
                ],
                display1: [
                    '7rem',
                    {
                        lineHeight: '100%',
                        letterSpacing: '-0.03rem',
                    },
                ],
            },
            backgroundColor: {
                primary: 'rgb(var(--color-bg-primary) / <alpha-value>)',
                'primary-inverted': 'rgb(var(--color-bg-primary-inverted) / <alpha-value>)',
                secondary: 'rgb(var(--color-bg-secondary) / <alpha-value>)',
                'secondary-inverted': 'rgb(var(--color-bg-secondary-inverted) / <alpha-value>)',
                tertiary: 'rgb(var(--color-bg-tertiary) / <alpha-value>)',
                'tertiary-inverted': 'rgb(var(--color-bg-tertiary-inverted) / <alpha-value>)',
                'button-primary': 'rgb(var(--color-bg-button-primary) / <alpha-value>)',
                'button-primary-hover': 'rgb(var(--color-bg-button-primary-hover) / <alpha-value>)',
                'button-primary-pressed':
                    'rgb(var(--color-bg-button-primary-pressed) / <alpha-value>)',
                'button-primary-disabled':
                    'rgb(var(--color-bg-button-primary-disabled) / <alpha-value>)',
                'button-secondary': 'rgb(var(--color-bg-button-secondary) / <alpha-value>)',
                'button-secondary-hover':
                    'rgb(var(--color-bg-button-secondary-hover) / <alpha-value>)',
                'button-secondary-pressed':
                    'rgb(var(--color-bg-button-secondary-pressed) / <alpha-value>)',
                'button-secondary-disabled':
                    'rgb(var(--color-bg-button-secondary-disabled) / <alpha-value>)',
            },
            borderColor: {
                primary: 'rgb(var(--color-line-border) / <alpha-value>)',
                hard: 'rgb(var(--color-line-hard) / <alpha-value>)',
                light: 'rgb(var(--color-line-light) / <alpha-value>)',
                error: 'rgb(var(--color-line-error) / <alpha-value>)',
                quote: 'rgb(var(--color-line-quote) / <alpha-value>)',
                'button-primary-hover':
                    'rgb(var(--color-line-button-primary-hover) / <alpha-value>)',
                'button-primary-pressed':
                    'rgb(var(--color-line-button-primary-pressed) / <alpha-value>)',
            },
            textColor: {
                primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
                'primary-inverted': 'rgb(var(--color-text-primary-inverted) / <alpha-value>)',
                secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'secondary-inverted': 'rgb(var(--color-text-secondary-inverted) / <alpha-value>)',
                tertiary: 'rgb(var(--color-text-tertiary) / <alpha-value>)',
                'tertiary-inverted': 'rgb(var(--color-text-tertiary-inverted) / <alpha-value>)',
                accent: 'rgb(var(--color-text-accent) / <alpha-value>)',
                'accent-hover': 'rgb(var(--color-text-accent-hover) / <alpha-value>)',
                'accent-pressed': 'rgb(var(--color-text-accent-pressed) / <alpha-value>)',
                error: 'rgb(var(--color-text-error) / <alpha-value>)',
                disabled: 'rgb(var(--color-text-disabled) / <alpha-value>)',
            },
            fill: {
                primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
                'primary-inverted': 'rgb(var(--color-text-primary-inverted) / <alpha-value>)',
                secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'secondary-inverted': 'rgb(var(--color-text-secondary-inverted) / <alpha-value>)',
                accent: 'rgb(var(--color-text-accent) / <alpha-value>)',
                'accent-pressed': 'rgb(var(--color-text-accent-pressed) / <alpha-value>)',
            },
            stroke: {
                primary: 'rgb(var(--color-line-border) / <alpha-value>)',
                secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'secondary-inverted': 'rgb(var(--color-text-secondary-inverted) / <alpha-value>)',
                accent: 'rgb(var(--color-text-accent) / <alpha-value>)',
            },
            boxShadowColor: {
                primary: 'rgb(var(--color-shadow-primary))',
            },
        },
    },
    plugins: [],
};

export default config;
