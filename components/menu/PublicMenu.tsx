'use client'

import { useState, useEffect } from 'react'
import DynamicFavicon from '@/components/admin/DynamicFavicon'
import CustomMenuViewer from './CustomMenuViewer'
import type { Database } from '@/lib/supabase/database.types'
import type { Theme } from '@/lib/themes'

type Business = Database['public']['Tables']['businesses']['Row']
type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

interface PublicMenuProps {
  business: Business
  categories: Category[]
  theme: Theme
}

export default function PublicMenu({ business, categories, theme }: PublicMenuProps) {
  const isPaused = business.status === 'paused'
  
  // ========================================================================
  // CUSTOM DESIGN RENDERING
  // ========================================================================
  // When user clicks "عرض القائمة ←" button in WelcomeScreen:
  // 1. The welcome splash hides
  // 2. This component checks if business.design exists
  // 3. If design exists: Render CustomMenuViewer with the design
  //    - The design was loaded from design_versions table in [slug]/page.tsx
  //    - Using getBusinessDesignForDisplay() function
  // 4. If no design: Show normal categories-based menu with theme
  // ========================================================================
  
  // If a custom design is attached to the business, render the custom menu viewer
  // The design is loaded from either:
  // - design_versions table (if qr_design_version_id is set)
  // - business.design column (as fallback)
  const design = (business as any).design as any | undefined
  if (design) {
    return <CustomMenuViewer design={design} business={business} />
  }

  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  )
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const isDark = theme.id === 'dark'
  const isMinimal = theme.id === 'minimal'

  const getVisibleCategories = () => {
    return categories.filter(cat => {
      // Filter out hidden categories
      if (cat.available === false) return false
      // Only show categories with at least one available item
      return cat.items.some(item => item.available)
    })
  }

  const visibleCategories = getVisibleCategories()

  // Language state: 'ar' (RTL) or 'en' (LTR) - default to user's browser language if available
  const getDefaultLang = () => {
    if (typeof navigator !== 'undefined') {
      return navigator.language?.startsWith('ar') ? 'ar' : 'en'
    }
    return 'ar'
  }
  const [lang, setLang] = useState<'ar'|'en'>(getDefaultLang())
  const isRTL = lang === 'ar'

  // Track scroll to update active category
  useEffect(() => {
    if (isMinimal) return
    
    const handleScroll = () => {
      const sections = visibleCategories.map(cat => ({
        id: cat.id,
        el: document.getElementById(`cat-${cat.id}`)
      }))
      
      const scrollPos = window.scrollY + 150

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section.el && section.el.offsetTop <= scrollPos) {
          setActiveCategory(section.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [visibleCategories, isMinimal])

  // Minimal theme - unique layout
  if (isMinimal) {
    return <MinimalLayout 
      business={business} 
      categories={visibleCategories} 
      theme={theme}
      isPaused={isPaused}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      expandedItem={expandedItem}
      setExpandedItem={setExpandedItem}
    />
  }

  // Default layout (Classic & Dark themes)
  return (
    <>
      <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
      <style jsx>{`
        .menu-container {
          scroll-behavior: smooth;
        }
        
        .menu-item {
          transition: all 0.25s ease;
        }
        
        .menu-item:hover {
          transform: translateX(-4px);
        }

        .ltr .menu-item:hover {
          transform: translateX(4px);
        }
        
        .menu-item-dark:hover {
          background: linear-gradient(270deg, rgba(212,175,55,0.08) 0%, transparent 100%);
        }
        
        .menu-item-light:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        .category-pill {
          transition: all 0.2s ease;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .item-image {
          transition: transform 0.4s ease;
        }
        
        .menu-item:hover .item-image {
          transform: scale(1.08);
        }
        
        .price-line {
          flex: 1;
          height: 1px;
          margin: 0 12px 6px;
          min-width: 20px;
          opacity: 0.2;
        }
        
        .price-line-dark {
          background: linear-gradient(270deg, transparent, ${theme.colors.primary}40, transparent);
        }
        
        .price-line-light {
          border-bottom: 1px dotted currentColor;
          background: transparent;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .gold-glow {
          text-shadow: 0 0 20px rgba(212,175,55,0.3);
        }
        
        .card-glow {
          box-shadow: 0 0 0 1px ${theme.colors.border}, 
                      0 4px 20px -4px rgba(0,0,0,0.5),
                      inset 0 1px 0 0 rgba(255,255,255,0.05);
        }
        
        .nav-glow {
          box-shadow: 0 4px 30px -10px rgba(0,0,0,0.8);
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .shimmer-border {
          position: relative;
        }
        
        .shimmer-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(90deg, transparent, ${theme.colors.primary}40, transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>

      <div
        className={`menu-container min-h-screen ${!isRTL ? 'ltr' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: isRTL ? "'Cairo', " + theme.font.body : theme.font.body,
        }}
      >
        {isPaused ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto px-6 py-12">
              <div 
                className="inline-block p-6 rounded-full mb-6"
                style={{ backgroundColor: theme.colors.border }}
              >
                <span className="text-5xl">⏸️</span>
              </div>
              <h1 
                className="text-2xl font-bold mb-3"
                style={{ 
                  fontFamily: "'Cairo', " + theme.font.heading,
                  color: theme.colors.text,
                }}
              >
                القائمة غير متاحة مؤقتاً
              </h1>
              <p 
                className="text-base"
                style={{ color: theme.colors.muted }}
              >
                نعتذر عن الإزعاج. القائمة غير متاحة في الوقت الحالي.
              </p>
              <p 
                className="text-sm mt-4"
                style={{ color: theme.colors.muted }}
              >
                {business.name}
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className={`relative pt-10 pb-8 sm:pt-16 sm:pb-12 ${isDark ? 'overflow-hidden' : ''}`}>
          {isDark && (
            <>
              <div 
                className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{ background: `radial-gradient(circle, ${theme.colors.primary}, transparent 70%)` }}
              />
              <div 
                className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
                style={{ background: `radial-gradient(circle, ${theme.colors.accent}, transparent 70%)` }}
              />
            </>
          )}
          
          {!isDark && (
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.colors.primary} 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />
          )}
          
            <div className="relative max-w-2xl mx-auto px-6 text-center">
              {/* Language toggle */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
                  className="px-3 py-1 bg-white/80 text-zinc-800 rounded-md border"
                >
                  {lang === 'ar' ? 'AR' : 'EN'}
                </button>
              </div>
            {business.logo_url && (
              <div className="mb-6 fade-in" style={{ animationDelay: '0.1s' }}>
                <img 
                  src={business.logo_url} 
                  alt={business.name}
                  className="h-20 w-auto sm:h-24 sm:w-auto object-contain mx-auto"
                />
              </div>
            )}
            
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 fade-in ${isDark ? 'gold-glow' : ''}`}
              style={{ 
                fontFamily: "'Cairo', " + theme.font.heading,
                color: isDark ? theme.colors.primary : theme.colors.text,
                letterSpacing: isDark ? '0.02em' : '0',
                animationDelay: '0.2s',
              }}
            >
              {business.name}
            </h1>
            
            <div 
              className="flex items-center justify-center gap-4 mt-6 fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <span 
                className="h-px w-16 sm:w-24"
                style={{ 
                  background: isDark 
                    ? `linear-gradient(270deg, transparent, ${theme.colors.primary}, transparent)` 
                    : theme.colors.border 
                }}
              />
              {isDark ? (
                <span style={{ color: theme.colors.primary }}>✦</span>
              ) : (
                <span 
                  className="text-xs tracking-[0.2em] uppercase font-medium"
                  style={{ color: theme.colors.muted }}
                >
                  القائمة
                </span>
              )}
              <span 
                className="h-px w-16 sm:w-24"
                style={{ 
                  background: isDark 
                    ? `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)` 
                    : theme.colors.border 
                }}
              />
            </div>
          </div>
        </header>

        {visibleCategories.length > 1 && (
          <nav 
            className={`sticky top-0 z-10 border-y backdrop-blur-md ${isDark ? 'nav-glow' : ''}`}
            style={{ 
              backgroundColor: isDark ? `${theme.colors.background}ee` : `${theme.colors.background}f5`,
              borderColor: theme.colors.border,
            }}
          >
            <div className="max-w-2xl mx-auto px-4">
              <div className={`flex overflow-x-auto py-4 gap-3 scrollbar-hide ${isRTL ? 'justify-start sm:justify-center' : 'justify-start sm:justify-center'}`}>
                {visibleCategories.map((category) => {
                  const isActive = activeCategory === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id)
                        document.getElementById(`cat-${category.id}`)?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start',
                        })
                      }}
                      className="category-pill whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: isActive 
                          ? theme.colors.primary 
                          : isDark ? theme.colors.secondary : 'transparent',
                        color: isActive 
                          ? (isDark ? '#000' : '#FFF')
                          : theme.colors.muted,
                        border: `1px solid ${isActive 
                          ? theme.colors.primary 
                          : theme.colors.border}`,
                        boxShadow: isActive && isDark 
                          ? `0 0 20px ${theme.colors.primary}40` 
                          : 'none',
                      }}
                    >
                      {category.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>
        )}

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="space-y-12">
            {visibleCategories.map((category, catIndex) => (
              <section 
                key={category.id} 
                id={`cat-${category.id}`}
                className="scroll-mt-20 fade-in"
                style={{ animationDelay: `${0.1 + catIndex * 0.1}s` }}
              >
                <div className="mb-8">
                  {category.image_url ? (
                    <div 
                      className={`relative h-36 sm:h-44 rounded-2xl overflow-hidden ${isDark ? 'card-glow' : ''}`}
                      style={{ border: `1px solid ${theme.colors.border}` }}
                    >
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                      <div 
                        className="absolute inset-0"
                        style={{ 
                          background: isDark 
                            ? 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 40%, transparent 100%)' 
                            : 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))',
                        }}
                      />
                      <div className="absolute bottom-0 right-0 left-0 p-5">
                        <h2
                          className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'gold-glow' : ''}`}
                          style={{ 
                            fontFamily: "'Cairo', " + theme.font.heading,
                            color: isDark ? theme.colors.primary : '#FFF',
                            textShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
                          }}
                        >
                          {category.name}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-center ${isDark ? 'py-4' : ''}`}>
                      <h2
                        className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'gold-glow' : ''}`}
                        style={{ 
                          fontFamily: "'Cairo', " + theme.font.heading,
                          color: theme.colors.primary,
                        }}
                      >
                        {category.name}
                      </h2>
                      <div 
                        className="w-20 h-0.5 mx-auto mt-4 rounded-full"
                        style={{ 
                          background: isDark 
                            ? `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)` 
                            : theme.colors.accent 
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {category.items
                    .filter((item) => item.available)
                    .map((item, itemIndex) => (
                      <article
                        key={item.id}
                        className={`menu-item rounded-xl p-4 ${isDark ? 'menu-item-dark' : 'menu-item-light'}`}
                        style={{ animationDelay: `${0.2 + itemIndex * 0.05}s` }}
                      >
                        <div className="flex items-start gap-4" dir="ltr">
                          {/* End left: Product image (no border, no rounded corners) */}
                          {item.image_url && (
                            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden">
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="item-image w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          {/* Right of image: Title + details */}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 
                              className="font-medium text-base sm:text-lg break-words"
                              style={{ 
                                fontFamily: "'Cairo', " + theme.font.heading,
                                color: theme.colors.text,
                              }}
                            >
                              {item.name}
                            </h3>
                            
                            {item.description && (
                              <p 
                                className="text-sm mt-1.5 leading-relaxed break-words"
                                style={{ color: theme.colors.muted }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Middle: Line separator */}
                          <span 
                            className={`price-line flex-shrink-0 flex-1 min-w-[20px] ${isDark ? 'price-line-dark' : 'price-line-light'}`}
                            style={{ color: theme.colors.muted, alignSelf: 'center' }}
                          />
                          
                          {/* End right: Price */}
                          {item.price && (
                            <div className="flex-shrink-0">
                              <span
                                className={`font-semibold text-base sm:text-lg whitespace-nowrap ${isDark ? 'gold-glow' : ''}`}
                                style={{ color: theme.colors.primary }}
                                dir="ltr"
                              >
                                {Number(item.price).toFixed(2)} TD
                              </span>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </div>

          {visibleCategories.length === 0 && (
            <div className="text-center py-20">
              <div 
                className={`inline-block p-6 rounded-full mb-6 ${isDark ? 'shimmer-border' : ''}`}
                style={{ backgroundColor: theme.colors.secondary }}
              >
                <span className="text-4xl">✦</span>
              </div>
              <h2 
                className={`text-xl font-medium mb-2 ${isDark ? 'gold-glow' : ''}`}
                style={{ 
                  fontFamily: "'Cairo', " + theme.font.heading,
                  color: isDark ? theme.colors.primary : theme.colors.text,
                }}
              >
                القائمة قريباً
              </h2>
              <p className="text-sm" style={{ color: theme.colors.muted }}>
                نحن نحضر شيئاً استثنائياً
              </p>
            </div>
          )}
        </main>

        <footer 
          className={`text-center py-10 mt-12 border-t ${isDark ? 'relative overflow-hidden' : ''}`}
          style={{ borderColor: theme.colors.border }}
        >
          {isDark && (
            <div 
              className="absolute inset-0 opacity-5"
              style={{ background: `radial-gradient(circle at 50% 0%, ${theme.colors.primary}, transparent 50%)` }}
            />
          )}
          <div className="relative">
            {/* Social Media Links */}
            {(business.facebook_url || business.instagram_url || business.twitter_url || business.whatsapp_number || business.website_url) && (
              <div className="flex items-center justify-center gap-4 mb-6">
                {business.facebook_url && (
                  <a
                    href={business.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: isDark ? 'rgba(59, 89, 152, 0.2)' : 'rgba(59, 89, 152, 0.1)',
                      color: isDark ? '#3b5998' : '#3b5998',
                    }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {business.instagram_url && (
                  <a
                    href={business.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: isDark ? 'rgba(225, 48, 108, 0.2)' : 'rgba(225, 48, 108, 0.1)',
                      color: isDark ? '#e1306c' : '#e1306c',
                    }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {business.twitter_url && (
                  <a
                    href={business.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: isDark ? 'rgba(29, 161, 242, 0.2)' : 'rgba(29, 161, 242, 0.1)',
                      color: isDark ? '#1da1f2' : '#1da1f2',
                    }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                )}
                {business.whatsapp_number && (
                  <a
                    href={`https://wa.me/${business.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.2)' : 'rgba(37, 211, 102, 0.1)',
                      color: isDark ? '#25d366' : '#25d366',
                    }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </a>
                )}
                {business.website_url && (
                  <a
                    href={business.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : theme.colors.secondary,
                      color: isDark ? theme.colors.primary : theme.colors.text,
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            
            <p className="text-xs tracking-[0.15em] uppercase mb-2" style={{ color: theme.colors.muted }}>
              شكراً لزيارتكم
            </p>
            <p 
              className={`text-lg font-medium ${isDark ? 'gold-glow' : ''}`}
              style={{ 
                fontFamily: "'Cairo', " + theme.font.heading,
                color: isDark ? theme.colors.primary : theme.colors.text,
              }}
            >
              {business.name}
            </p>
          </div>
        </footer>
          </>
        )}
      </div>
    </>
  )
}

// ============================================
// MINIMAL THEME - Unique Split Layout
// ============================================
function MinimalLayout({
  business,
  categories,
  theme,
  isPaused,
  activeCategory,
  setActiveCategory,
  expandedItem,
  setExpandedItem,
}: {
  business: Business
  categories: Category[]
  theme: Theme
  isPaused: boolean
  activeCategory: string | null
  setActiveCategory: (id: string | null) => void
  expandedItem: string | null
  setExpandedItem: (id: string | null) => void
}) {
  const activeItems = categories.find(c => c.id === activeCategory)?.items.filter(i => i.available) || []

  return (
    <div
      className="minimal-container flex flex-col"
      dir="rtl"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: "'Cairo', " + theme.font.body,
      }}
    >
      <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
        {isPaused ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto px-6 py-12">
              <div 
                className="inline-block p-6 rounded-full mb-6"
                style={{ backgroundColor: theme.colors.border }}
              >
                <span className="text-5xl">⏸️</span>
              </div>
              <h1 
                className="text-2xl font-bold mb-3"
                style={{ 
                  fontFamily: "'Cairo', " + theme.font.heading,
                  color: theme.colors.text,
                }}
              >
                القائمة غير متاحة مؤقتاً
              </h1>
              <p 
                className="text-base"
                style={{ color: theme.colors.muted }}
              >
                نعتذر عن الإزعاج. القائمة غير متاحة في الوقت الحالي.
              </p>
              <p 
                className="text-sm mt-4"
                style={{ color: theme.colors.muted }}
              >
                {business.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            {/* Compact Header */}
            <header 
              className="border-b px-4 sm:px-6 py-4 sm:py-6"
              style={{ borderColor: theme.colors.border }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {business.logo_url && (
                    <img 
                      src={business.logo_url} 
                      alt={business.name}
                      className="h-10 w-auto sm:h-12 sm:w-auto object-contain"
                    />
                  )}
                  <div>
                    <h1 
                      className="text-lg sm:text-xl font-semibold tracking-tight"
                      style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                    >
                      {business.name}
                    </h1>
                    <p className="text-xs sm:text-sm" style={{ color: theme.colors.muted }}>
                      القائمة
                    </p>
                  </div>
                </div>
                
                {/* Item count badge - Hidden on mobile */}
                <div 
                  className="hidden sm:block text-xs px-3 py-1 rounded-full font-medium"
                  style={{ 
                    backgroundColor: theme.colors.secondary,
                    color: theme.colors.muted,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  {categories.reduce((acc, cat) => acc + cat.items.filter(i => i.available).length, 0)} عناصر
                </div>
              </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex flex-col md:flex-row">
          
            {/* Category Sidebar */}
            <aside 
              className="border-b md:border-b-0 md:border-l md:w-52 flex-shrink-0"
              style={{ borderColor: theme.colors.border }}
            >
            {/* Mobile: Horizontal scroll */}
            <div className="md:hidden overflow-x-auto mobile-scroll">
              <div className="flex px-4 py-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: activeCategory === cat.id 
                        ? theme.colors.primary 
                        : theme.colors.secondary,
                      color: activeCategory === cat.id 
                        ? '#FFF' 
                        : theme.colors.text,
                      border: `1px solid ${activeCategory === cat.id ? theme.colors.primary : theme.colors.border}`,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Desktop: Vertical list */}
            <nav className="hidden md:block sticky top-0 py-6 px-4 max-h-screen overflow-y-auto scrollbar-thin">
              <p 
                className="text-xs font-medium uppercase tracking-wider mb-4 px-3"
                style={{ color: theme.colors.muted }}
              >
                الفئات
              </p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`category-tab w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium ${activeCategory === cat.id ? 'active' : ''}`}
                    style={{
                      backgroundColor: activeCategory === cat.id 
                        ? theme.colors.secondary 
                        : 'transparent',
                      color: activeCategory === cat.id 
                        ? theme.colors.primary 
                        : theme.colors.text,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

            {/* Items Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
              
              {/* Active Category Header */}
              {activeCategory && (
                <div className="mb-6 minimal-fade">
                  {categories.find(c => c.id === activeCategory)?.image_url && (
                    <div 
                      className="relative h-32 sm:h-40 rounded-xl overflow-hidden mb-4"
                      style={{ border: `1px solid ${theme.colors.border}` }}
                    >
                      <img 
                        src={categories.find(c => c.id === activeCategory)?.image_url || ''} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div 
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)' }}
                      />
                      <h2 
                        className="absolute bottom-4 right-4 text-2xl font-semibold text-white"
                        style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                      >
                        {categories.find(c => c.id === activeCategory)?.name}
                      </h2>
                    </div>
                  )}
                  
                  {!categories.find(c => c.id === activeCategory)?.image_url && (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b" style={{ borderColor: theme.colors.border }}>
                      <h2 
                        className="text-2xl font-semibold"
                        style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                      >
                        {categories.find(c => c.id === activeCategory)?.name}
                      </h2>
                      <span className="text-sm" style={{ color: theme.colors.muted }}>
                        {activeItems.length} عناصر
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Items Grid */}
              <div className="space-y-3">
                {activeItems.map((item, idx) => (
                  <article
                    key={item.id}
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                    className="minimal-item minimal-fade cursor-pointer rounded-xl p-4"
                    style={{ 
                      backgroundColor: theme.colors.secondary,
                      border: `1px solid ${expandedItem === item.id ? theme.colors.accent : theme.colors.border}`,
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  >
                    <div className="flex items-start gap-4" dir="ltr">
                      {/* End left: Product image (no border, no rounded corners) */}
                      {item.image_url && (
                        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden">
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Right of image: Title + details */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 
                          className="font-semibold text-base break-words"
                          style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                        >
                          {item.name}
                        </h3>
                        {item.description && !expandedItem && (
                          <p 
                            className="text-sm mt-0.5 line-clamp-1 break-words"
                            style={{ color: theme.colors.muted }}
                          >
                            {item.description}
                          </p>
                        )}
                        
                        {/* Expanded Content */}
                        <div 
                          className="item-expand"
                          style={{ 
                            maxHeight: expandedItem === item.id ? '200px' : '0',
                            marginTop: expandedItem === item.id ? '12px' : '0',
                            opacity: expandedItem === item.id ? 1 : 0,
                          }}
                        >
                          {item.description && (
                            <p 
                              className="text-sm leading-relaxed break-words"
                              style={{ color: theme.colors.muted }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Middle: Line separator */}
                      <div className="flex-1 min-w-[20px]" style={{ alignSelf: 'center' }}>
                        <span 
                          className="block w-full border-b"
                          style={{ borderColor: theme.colors.border }}
                        />
                      </div>
                      
                      {/* End right: Price + Expand indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Expand indicator */}
                        <div 
                          className="transition-transform"
                          style={{ 
                            transform: expandedItem === item.id ? 'rotate(180deg)' : 'rotate(0)',
                            color: theme.colors.muted,
                          }}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        
                        {item.price && (
                          <span 
                            className="font-bold text-base whitespace-nowrap"
                            style={{ color: theme.colors.accent }}
                            dir="ltr"
                          >
                            {Number(item.price).toFixed(2)} TD
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Empty State */}
              {activeItems.length === 0 && (
                <div className="text-center py-16">
                  <div 
                    className="inline-block p-4 rounded-full mb-4"
                    style={{ backgroundColor: theme.colors.border }}
                  >
                    <span className="text-2xl">📋</span>
                  </div>
                  <p style={{ color: theme.colors.muted }}>
                    لا توجد عناصر في هذه الفئة
                  </p>
                </div>
              )}
              </div>
            </main>
            </div>

            {/* Minimal Footer */}
            <footer 
              className="border-t py-4 px-4 text-center"
              style={{ borderColor: theme.colors.border }}
            >
              {/* Social Media Links */}
              {(business.facebook_url || business.instagram_url || business.twitter_url || business.whatsapp_number || business.website_url) && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  {business.facebook_url && (
                    <a
                      href={business.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        backgroundColor: 'rgba(59, 89, 152, 0.1)',
                        color: '#3b5998',
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  {business.instagram_url && (
                    <a
                      href={business.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        backgroundColor: 'rgba(225, 48, 108, 0.1)',
                        color: '#e1306c',
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                  )}
                  {business.twitter_url && (
                    <a
                      href={business.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        backgroundColor: 'rgba(29, 161, 242, 0.1)',
                        color: '#1da1f2',
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  )}
                  {business.whatsapp_number && (
                    <a
                      href={`https://wa.me/${business.whatsapp_number.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        backgroundColor: 'rgba(37, 211, 102, 0.1)',
                        color: '#25d366',
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </a>
                  )}
                  {business.website_url && (
                    <a
                      href={business.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        backgroundColor: theme.colors.secondary,
                        color: theme.colors.text,
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
              <p className="text-xs" style={{ color: theme.colors.muted }}>
                © {business.name}
              </p>
            </footer>
          </div>
        )}
      </div>
  )
}
