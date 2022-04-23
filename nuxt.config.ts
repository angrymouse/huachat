import { defineNuxtConfig } from 'nuxt'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    ssr: false,
mode:"spa",
    target: "static",
    
    buildModules: ["@nuxtjs/tailwindcss"],
css:["~/assets/css/main.css"]
})
