import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia', // Utilizando una versión recomendada reciente
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');

    let event;

    try {
        if (!sig || !endpointSecret) throw new Error("Missing stripe signature or secret.");
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = await createClient();

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const checkoutSession = event.data.object as Stripe.Checkout.Session;
            // TODO: Activar el tenant en Supabase usando Supabase Admin Role para brincar RLS en el webhook
            // Ejemplo: update "tenants" set is_active=true where tenant_id = checkoutSession.client_reference_id
            console.log('Checkout session completed for tenant:', checkoutSession.client_reference_id);
            break;

        case 'customer.subscription.deleted':
        case 'customer.subscription.paused':
            const subscription = event.data.object as Stripe.Subscription;
            // TODO: Desactivar el tenant por falta de pago
            console.log('Subscription paused/deleted:', subscription.id);
            break;

        // ... manejar otras facturaciones (Stripe Connect B2B2C)
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
