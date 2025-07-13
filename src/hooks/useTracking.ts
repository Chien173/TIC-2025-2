/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';

export const useTracking = () => {
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    try {
      if ((window as any).track) {
        (window as any).track(eventName, properties);
      }
    } catch (error) {
      console.error('Tracking error:', error);
    }
  }, []);

  const trackSchemaAudit = useCallback((url: string) => {
    track('schema_audit_clicked', {
      url,
      timestamp: new Date().toISOString(),
      action: 'audit_website'
    });
  }, [track]);

  const trackPublishSchema = useCallback((domain: string, postId?: string) => {
    track('publish_schema_clicked', {
      domain,
      postId,
      timestamp: new Date().toISOString(),
      action: 'publish_schema'
    });
  }, [track]);

  const trackConnectWordPress = useCallback((domain: string) => {
    track('connect_wordpress_clicked', {
      domain,
      timestamp: new Date().toISOString(),
      action: 'connect_wordpress'
    });
  }, [track]);

  const trackPostAudit = useCallback((postId: string, postTitle: string) => {
    track('post_audit_clicked', {
      postId,
      postTitle,
      timestamp: new Date().toISOString(),
      action: 'audit_post'
    });
  }, [track]);

  return {
    track,
    trackSchemaAudit,
    trackPublishSchema,
    trackConnectWordPress,
    trackPostAudit
  };
};