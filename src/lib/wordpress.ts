import { supabase } from "./supabase";

// create wordpress api service
const wordpressApi = {
  getIntegrations: async (websiteId: string) => {
    // call supabase to get the integrations for the website
    const { data, error } = await supabase
      .from("wordpress_integrations")
      .select("*")
      .eq("website_id", websiteId);
    if (error) throw error;
    return data;
  }

  getPosts: async (websiteId: string) => {
    const integrations = await wordpressApi.getIntegrations(websiteId);

    const { data: integrationsData, } = integrations;

    const { domain, username, application_password } = integrationsData;

    // call wordpress api to get the posts for each integration
    const res = await fetch(`https://${domain}/wp-json/wp/v2/posts`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    });
    return res.json();
  },
};

export default wordpressApi;