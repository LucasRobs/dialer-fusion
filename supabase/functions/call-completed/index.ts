import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"

// Set up CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Setup Supabase client with environment variables
const supabaseUrl = "https://wwzlfjoiuoocbatfizac.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3emxmam9pdW9vY2JhdGZpemFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNTY5ODEsImV4cCI6MjA1ODkzMjk4MX0.D10AhJ4BeF4vWtH--RYM7WKwePOlZOhEX2tRF0hTfHU"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  try {
    // Only allow POST requests to this endpoint
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse the request body
    const requestData = await req.json()
    console.log('Call completed webhook received:', requestData)

    // Validate required fields
    const { client_id, campaign_id, call_status, call_duration } = requestData
    if (!client_id || !campaign_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: client_id and campaign_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 1. Update call status in campaign_clients table
    const { error: updateClientError } = await supabase
      .from('campaign_clients')
      .update({
        status: call_status || 'completed'
      })
      .match({
        campaign_id,
        client_id
      })

    if (updateClientError) {
      console.error('Error updating campaign client:', updateClientError)
      throw updateClientError
    }

    // 2. Update campaign statistics
    // First, get current campaign data
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single()

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError)
      throw campaignError
    }

    // Calculate new statistics
    const newAnsweredCalls = (campaignData.answered_calls || 0) + 1
    
    // Calculate new average duration if call_duration is provided
    let newAverageDuration = campaignData.average_duration || 0
    if (call_duration) {
      const totalDurationBefore = (campaignData.average_duration || 0) * (campaignData.answered_calls || 0)
      const totalDurationAfter = totalDurationBefore + call_duration
      newAverageDuration = Math.round(totalDurationAfter / newAnsweredCalls)
    }

    // Update campaign with new statistics
    const { error: updateCampaignError } = await supabase
      .from('campaigns')
      .update({
        answered_calls: newAnsweredCalls,
        average_duration: newAverageDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id)

    if (updateCampaignError) {
      console.error('Error updating campaign statistics:', updateCampaignError)
      throw updateCampaignError
    }

    // 3. Create a call record if it doesn't exist
    // Check if there's already a call record
    const { data: existingCall, error: checkCallError } = await supabase
      .from('calls')
      .select('id')
      .match({
        campaign_id,
        client_id
      })
      .maybeSingle()

    if (checkCallError) {
      console.error('Error checking for existing call:', checkCallError)
      throw checkCallError
    }

    // Only insert a new call record if one doesn't exist
    if (!existingCall) {
      const callData = {
        campaign_id,
        client_id,
        status: call_status || 'completed',
        call_start: requestData.call_start || new Date().toISOString(),
        call_end: requestData.call_end || new Date().toISOString(),
        duration: call_duration || 0,
        call_summary: requestData.call_summary || '',
        recording_url: requestData.recording_url || '',
        assistant_id: requestData.assistant_id || campaignData.assistant_id || null
      }

      const { error: insertCallError } = await supabase
        .from('calls')
        .insert([callData])

      if (insertCallError) {
        console.error('Error creating call record:', insertCallError)
        throw insertCallError
      }
    } else if (call_duration || requestData.call_end || requestData.call_summary) {
      // Update existing call with new information
      const updateData: any = {}
      if (call_status) updateData.status = call_status
      if (call_duration) updateData.duration = call_duration
      if (requestData.call_end) updateData.call_end = requestData.call_end
      if (requestData.call_summary) updateData.call_summary = requestData.call_summary
      if (requestData.recording_url) updateData.recording_url = requestData.recording_url
      
      const { error: updateCallError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', existingCall.id)

      if (updateCallError) {
        console.error('Error updating call record:', updateCallError)
        throw updateCallError
      }
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Call completion processed successfully',
      campaign_id,
      client_id,
      answered_calls: newAnsweredCalls
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error processing call completion:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
