"use client"

import { motion } from "framer-motion"
import { Code, Paintbrush, Rocket, Users } from "lucide-react"
import { Button } from '../../../components/ui/button'

const services = [
  {
    icon: Code,
    title: "Development",
    description: "Custom web applications built with cutting-edge technologies and best practices.",
    features: ["React & Next.js", "TypeScript", "API Integration", "Performance Optimization"],
  },
  {
    icon: Paintbrush,
    title: "Design",
    description: "Beautiful, user-centered designs that convert visitors into customers.",
    features: ["UI/UX Design", "Brand Identity", "Prototyping", "Design Systems"],
  },
  {
    icon: Rocket,
    title: "Strategy",
    description: "Data-driven strategies to accelerate your digital transformation journey.",
    features: ["Digital Strategy", "Market Analysis", "Growth Planning", "ROI Optimization"],
  },
  {
    icon: Users,
    title: "Consulting",
    description: "Expert guidance to navigate complex technical challenges and decisions.",
    features: ["Technical Audit", "Architecture Review", "Team Training", "Best Practices"],
  },
]

export default function Services() {
  return (
    <section className="py-32 px-4 relative">
      {/* Geometric Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-slate-800/20 to-zinc-800/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tl from-zinc-700/20 to-slate-700/20 rounded-full blur-3xl" />

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(148, 163, 184, 0.1) 90deg, transparent 180deg, rgba(113, 113, 122, 0.1) 270deg, transparent 360deg)`,
              backgroundSize: "200px 200px",
            }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-zinc-400 bg-clip-text text-transparent">
            Our Services
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Comprehensive solutions tailored to elevate your digital presence
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-gradient-to-br from-zinc-900/80 to-slate-900/80 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all duration-300 relative overflow-hidden">
                {/* Service Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage:
                        index % 2 === 0
                          ? "radial-gradient(circle, rgba(148, 163, 184, 0.5) 2px, transparent 2px)"
                          : "linear-gradient(45deg, rgba(113, 113, 122, 0.5) 25%, transparent 25%)",
                      backgroundSize: index % 2 === 0 ? "20px 20px" : "20px 20px",
                    }}
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-zinc-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <service.icon className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-3xl font-bold text-white">{service.title}</h3>
                  </div>

                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">{service.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-slate-300">
                        <div className="w-2 h-2 bg-slate-500 rounded-full" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="border-slate-600 text-black hover:bg-slate-800 hover:text-white group-hover:border-slate-500 transition-colors"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
