'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Role } from '@/lib/utils/rbac'

export async function login(formData: FormData) {
    console.log("ENV VARS DISPONIBLES EN ACTION:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));

    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/?error=Revisa+los+campos+obligatorios')
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Redirigir de vuelta a la home pasándole el code de error por param
        redirect(`/?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')

    // Redirección Inteligente por Rol
    const role: Role = authData.user?.app_metadata?.role || "MEMBER";

    if (role === 'SUPER_ADMIN') {
        redirect('/admin')
    } else {
        redirect('/dashboard')
    }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
}
