"use client"
import React from 'react'
import WelcomeScreen from './WelcomeScreen'
import PublicMenu from './PublicMenu'

export default function WelcomeWrapper({ business, categories, theme }: { business: any, categories: any, theme: any }){
  return (
    <WelcomeScreen business={business}>
      <PublicMenu business={business} categories={categories} theme={theme} />
    </WelcomeScreen>
  )
}
