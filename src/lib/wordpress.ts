import { supabase } from "./supabase";

export interface WordPressPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  link: string
  date: string
  author: number
  status: string
  excerpt: { rendered: string }
}

// WordPress API service
const wordpressApi = {
  getIntegrations: async (websiteId?: string) => {
    let query = supabase
      .from("wordpress_integrations")
      .select("*")
      .eq("connection_status", "connected")
      .is("deleted_at", null);
    
    if (websiteId) {
      query = query.eq("website_id", websiteId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getPosts: async (websiteId: string): Promise<WordPressPost[]> => {
    // Get integrations for the website
    const integrations = await wordpressApi.getIntegrations(websiteId);
    
    if (!integrations || integrations.length === 0) {
      throw new Error("No WordPress integrations found for this website");
    }

    // Use the first integration (assuming one integration per website)
    const integration = integrations[0];
    const { domain, username, application_password } = integration;

    // Ensure domain has protocol
    const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    
    // Create basic auth header
    const auth = btoa(`${username}:${application_password}`);
    
    // Call WordPress API to get posts
    const response = await fetch(`${fullDomain}/wp-json/wp/v2/posts?per_page=20&status=publish`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} - ${response.statusText}`);
    }

    console.log(response.json());

    return await response.json();
  },

  getAllIntegrations: async () => {
    const { data, error } = await supabase
      .from("wordpress_integrations")
      .select(`
        *,
        website:websites(*)
      `)
      .eq("connection_status", "connected")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

export default wordpressApi;