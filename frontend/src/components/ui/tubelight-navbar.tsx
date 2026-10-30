import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NavItem {
  name: string
  url?: string
  icon: LucideIcon
  onClick?: () => void
}

export interface NavBarProps {
  items: NavItem[]
  className?: string
  activeTab?: string
  onTabChange?: (name: string) => void
}

export function NavBar({ items, className, activeTab: controlledActiveTab, onTabChange }: NavBarProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(items[0]?.name || "")
  const [isMobile, setIsMobile] = useState(false)

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleSelect = (item: NavItem) => {
    setInternalActiveTab(item.name)
    if (onTabChange) {
      onTabChange(item.name)
    }
    if (item.onClick) {
      item.onClick()
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6",
        className,
      )}
    >
      <div className="flex items-center gap-1 sm:gap-2 bg-black/60 border border-white/15 backdrop-blur-xl py-1 px-1.5 rounded-full shadow-2xl">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleSelect(item)}
              className={cn(
                "relative cursor-pointer text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 rounded-full transition-colors flex items-center space-x-2",
                "text-neutral-400 hover:text-white",
                isActive && "text-white font-bold",
              )}
            >
              <Icon size={16} strokeWidth={2.2} className={cn("transition-colors", isActive ? "text-nothing-red" : "text-neutral-400")} />
              <span className="hidden md:inline font-ndot tracking-wide">{item.name}</span>
              <span className="md:hidden">
                <span className="sr-only">{item.name}</span>
              </span>

              {/* Tubelight Lamp Beam */}
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-white/10 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 28,
                  }}
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-nothing-red rounded-t-full shadow-[0_0_12px_#d73832]">
                    <div className="absolute w-12 h-6 bg-nothing-red/30 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-nothing-red/30 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-white/40 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
