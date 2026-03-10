import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import Replicate from "replicate";
import { supabaseAdmin } from "../../../utils/supabase";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const generateMidi = inngest.createFunction(
    { id: "generate-midi" },
    { event: "app/generate-midi" },
    async ({ event, step }) => {
        const { prompt, userId, generationId } = event.data;

        // Step 1: Initialize generation
        await step.run("mark-processing", async () => {
            console.log(`Starting MIDI generation for prompt: ${prompt}`);
            await supabaseAdmin.from("generations").update({ status: "processing" }).eq("id", generationId);
        });

        // Step 2: Call the Text-to-MIDI model on Replicate
        const midiOutputContent = await step.run("replicate-generation", async () => {
            const output: unknown = await replicate.run(
                "sander-wood/text-to-midi:bf1ed0d5f2ea7007e992520c159bf461ee6cc642647c21ae9add7c2aebe94c50",
                {
                    input: { prompt: prompt, duration: 15 } // Configurable params
                }
            );

            if (!output) throw new Error("No output from Replicate");

            const url = Array.isArray(output) ? output[0] : output;

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer).toString("base64");
        });

        // Step 3: Insert into Supabase (mock implementation)
        const midiUrl = await step.run("upload-supabase", async () => {
            const buffer = Buffer.from(midiOutputContent, "base64");
            const filename = `${userId}/${generationId}.mid`;

            const { error } = await supabaseAdmin.storage
                .from('midis')
                .upload(filename, buffer, {
                    contentType: 'audio/midi',
                    upsert: true
                });

            if (error) throw error;

            const { data: publicUrlData } = supabaseAdmin.storage.from('midis').getPublicUrl(filename);
            return publicUrlData.publicUrl;
        });

        // Step 4: Finalize the Database Record
        await step.run("finalize-record", async () => {
            await supabaseAdmin.from("generations").update({
                status: "completed",
                midi_url: midiUrl
            }).eq("id", generationId);
        });

        return {
            success: true,
            midiUrl,
            prompt,
        };
    }
);

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [generateMidi],
});
