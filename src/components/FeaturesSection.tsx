import { motion } from "framer-motion";
import { Brain, BarChart3, Upload, TrendingUp, Recycle, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Classification",
    description: "Advanced AI instantly detects and classifies waste into wet and dry categories with percentage distribution.",
  },
  {
    icon: BarChart3,
    title: "Visual Dashboard",
    description: "Beautiful progress bars and charts to visualize your waste composition at a glance.",
  },
  {
    icon: Upload,
    title: "Easy Upload",
    description: "Drag-and-drop or click to upload waste images with instant preview and analysis.",
  },
  {
    icon: TrendingUp,
    title: "Daily Tracking",
    description: "Track your waste patterns over time. Compare today's stats with yesterday's for better habits.",
  },
  {
    icon: Recycle,
    title: "Dominant Detection",
    description: "Clearly highlights whether wet or dry waste is dominant in your uploads.",
  },
  {
    icon: Shield,
    title: "Eco Insights",
    description: "Get actionable recommendations to reduce waste and improve your recycling efficiency.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            Why Choose <span className="text-primary">EcoSort</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-body">
            Powerful AI-driven features designed to make waste management effortless and impactful.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="eco-card group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
