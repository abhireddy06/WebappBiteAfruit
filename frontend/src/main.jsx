import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Apple,
  Bike,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  HeartPulse,
  LineChart,
  LogOut,
  LocateFixed,
  Menu,
  MessageCircle,
  Moon,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  WalletCards,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

const plans = [
  {
    id: 1,
    name: "Weight Loss Bowl",
    goal: "Weight Loss",
    description: "Low-calorie fruits, sprouts, cucumber, and chia seeds for steady fat-loss support.",
    fruits_included: ["Apple", "Papaya", "Watermelon", "Guava", "Cucumber", "Sprouts", "Chia Seeds"],
    optional_addons: ["Boiled Eggs", "Sprouts", "Dry Fruits", "Protein Mix"],
    price: 3499,
    discount: 500,
    final_price: 2999
  },
  {
    id: 2,
    name: "Weight Gain Bowl",
    goal: "Weight Gain",
    description: "Calorie-dense fruits, nuts, eggs, peanut butter, and protein-rich ingredients.",
    fruits_included: ["Banana", "Mango", "Dates", "Avocado", "Dry Fruits", "Boiled Eggs", "Peanut Butter"],
    optional_addons: ["Boiled Eggs", "Sprouts", "Dry Fruits", "Protein Mix"],
    price: 4299,
    discount: 600,
    final_price: 3699
  },
  {
    id: 3,
    name: "Medium Bowl",
    goal: "Balanced Nutrition",
    description: "A balanced monthly fruit bowl plan with seasonal fruits and light add-ons for everyday wellness.",
    fruits_included: ["Apple", "Banana", "Papaya", "Watermelon", "Guava", "Sprouts"],
    optional_addons: ["Sprouts", "Dry Fruits", "Chia Seeds", "Protein Mix"],
    price: 2500,
    discount: 500,
    final_price: 2000
  }
];

const products = [
  {
    name: "Medium Bowl",
    price: 2000,
    originalPrice: 2500,
    deliveryDays: "Monday to Friday",
    fruits: ["3 Fruits", "2 Veggies", "Sprouts", "1 Boiled Egg"],
    image: "/images/medium-bowl-fruits-veggies-sprouts-egg.png"
  },
  {
    name: "Weight Loss Bowl",
    price: 2999,
    originalPrice: 3499,
    deliveryDays: "Monday to Saturday",
    fruits: ["Apple", "Watermelon", "Papaya", "Guava", "Orange", "Pineapple", "Boiled Egg"],
    image: "/images/weight-loss-bowl.png"
  },
  {
    name: "Weight Gain Bowl",
    price: 2999,
    originalPrice: 4299,
    deliveryDays: "Monday to Saturday",
    fruits: ["Banana", "Mango", "Grapes", "Dates", "Apple", "Dry Fruits", "Boiled Egg"],
    image: "/images/weight-gain-bowl.png"
  }
];

const productFallbacks = products.reduce((lookup, product) => {
  lookup[product.name] = product;
  return lookup;
}, {});

function planImage(plan) {
  return plan.image_url || productFallbacks[plan.name]?.image || "/images/medium-bowl-fruits-veggies-sprouts-egg.png";
}

function deliveryDaysText(deliveryDays) {
  return Array.isArray(deliveryDays) && deliveryDays.length ? deliveryDays.join(", ") : "Delivery days managed by admin";
}

const progressData = [
  { week: "Start", weight: 72 },
  { week: "W1", weight: 70.8 },
  { week: "W2", weight: 69.9 },
  { week: "Goal", weight: 66 }
];

function api(path, options = {}) {
  if (!API_URL) {
    return Promise.reject(new Error("VITE_API_URL is not configured for this deployment"));
  }
  const token = localStorage.getItem("bite_token");
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  }).then(async (response) => {
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || "Request failed");
    }
    return response.json();
  });
}

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem("bite_user") || "null");
  } catch {
    localStorage.removeItem("bite_user");
    return null;
  }
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function lastItem(items) {
  return items.length ? items[items.length - 1] : undefined;
}

function humanizeStatus(status = "") {
  return status.split("_").join(" ");
}

function Badge({ children, tone = "green" }) {
  const tones = {
    green: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
    slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Button({ children, variant = "primary", className = "", type = "button", ...props }) {
  const styles = {
    primary: "bg-brand-green text-white hover:bg-green-600",
    secondary: "bg-brand-orange text-white hover:bg-orange-600",
    ghost: "bg-white/80 text-brand-ink hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
    outline: "border border-slate-200 bg-transparent text-brand-ink hover:border-brand-green dark:border-white/15 dark:text-white"
  };
  return (
    <button type={type} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Section({ id, children, className = "" }) {
  return (
    <section id={id} className={`px-4 py-16 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

function Header({ view, setView, dark, setDark, user, logout }) {
  const [open, setOpen] = useState(false);
  const nav = [
    ["home", "Home"],
    ["plans", "Plans"],
    ["about", "About"],
    ["contact", "Contact"]
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button onClick={() => setView("home")} className="flex items-center gap-3 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-green text-white">
            <Apple size={24} />
          </span>
          <span>
            <span className="block text-lg font-extrabold text-brand-ink dark:text-white">Bite a Fruit</span>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Eat Healthy, Live Better</span>
          </span>
        </button>
        <nav className="hidden items-center gap-2 md:flex">
          {nav.map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === key ? "text-brand-green" : "text-slate-600 hover:text-brand-ink dark:text-slate-300 dark:hover:text-white"}`}>
              {label}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</Button>
          {user ? (
            <>
              <Button variant="outline" onClick={() => setView(`${user.role}-dashboard`)}><User size={18} />Dashboard</Button>
              <Button variant="secondary" onClick={logout}><LogOut size={18} />Logout</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setView("register")}><User size={18} />Register</Button>
              <Button onClick={() => setView("login")}><ShieldCheck size={18} />Login</Button>
            </>
          )}
        </div>
        <Button variant="ghost" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Open menu">{open ? <X /> : <Menu />}</Button>
      </div>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden dark:border-white/10">
          <div className="grid gap-2">
            {nav.map(([key, label]) => <Button key={key} variant="ghost" onClick={() => { setView(key); setOpen(false); }}>{label}</Button>)}
            <Button variant="ghost" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}Theme</Button>
            {user ? (
              <Button onClick={() => { setView(`${user.role}-dashboard`); setOpen(false); }}>Dashboard</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setView("register"); setOpen(false); }}>Register</Button>
                <Button onClick={() => { setView("login"); setOpen(false); }}>Login</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ setView }) {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(34,197,94,.13),rgba(249,115,22,.12),transparent_65%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-78px)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <div className="max-w-3xl">
          <Badge tone="orange">Monday to Friday fruit bowl subscriptions</Badge>
          <h1 className="mt-6 text-5xl font-extrabold tracking-normal text-brand-ink sm:text-6xl lg:text-7xl dark:text-white">Bite a Fruit</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Premium fruit bowls tailored for healthy Weight Loss and Weight Gain programs, with nutrition tracking, delivery management, and weekly progress support.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setView("plans")}><Apple size={18} />Choose a Plan</Button>
            <Button variant="outline" onClick={() => setView("register")}><ChevronRight size={18} />Start Subscription</Button>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {["1 Month", "Mon-Fri", "UPI Ready"].map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-white/80 p-3 text-center text-sm font-bold text-brand-ink shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">{item}</div>)}
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden rounded-[2rem] shadow-soft">
            <img
              src="https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=1200&q=80"
              alt="Fresh fruit bowl with colorful fruit"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-5 right-5 rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Today&apos;s Bowl</p>
                <p className="text-xl font-extrabold text-brand-ink dark:text-white">Papaya, Guava, Sprouts</p>
              </div>
              <Badge>312 kcal</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    [HeartPulse, "Goal-led bowls", "Weight Loss and Weight Gain compositions with add-ons."],
    [CalendarDays, "Weekday delivery", "Subscriptions schedule fresh bowls Monday through Friday."],
    [LineChart, "Progress tracking", "Weekly weight updates, photos, and goal percentage."],
    [MessageCircle, "WhatsApp updates", "Automated confirmations, reminders, renewals, and check-ins."]
  ];
  return (
    <Section>
      <div className="grid gap-4 md:grid-cols-4">
        {items.map(([Icon, title, text]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <Icon className="text-brand-green" />
            <h3 className="mt-4 text-lg font-bold text-brand-ink dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ProductCards({ setView, setSelectedPlanName }) {
  const [displayProducts, setDisplayProducts] = useState(plans);

  useEffect(() => {
    let cancelled = false;
    api("/plans")
      .then((data) => {
        if (!cancelled) setDisplayProducts(data);
      })
      .catch(() => {
        if (!cancelled) setDisplayProducts(plans);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function orderProduct(productName) {
    setSelectedPlanName(productName);
    setView("register");
  }

  return (
    <Section id="products">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge tone="orange">Fresh Bowl Products</Badge>
          <h2 className="mt-4 text-3xl font-extrabold text-brand-ink sm:text-4xl dark:text-white">Fresh bowls made for your daily health goals</h2>
        </div>
        <p className="max-w-xl text-slate-600 dark:text-slate-300">Choose from balanced, weight-loss, and weight-gain bowls made with fresh fruits and practical add-ons.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {displayProducts.map((product) => (
          <div key={product.id || product.name} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={planImage(product)} alt={`${product.name} fruit bowl`} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-extrabold text-brand-ink dark:text-white">{product.name}</h3>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 line-through">{formatCurrency(product.price)}</p>
                  <p className="text-2xl font-extrabold text-brand-green">{formatCurrency(product.final_price)}</p>
                </div>
              </div>
              <div className="mt-4 flex min-h-24 flex-wrap content-start gap-2">
                {(product.fruits_included || productFallbacks[product.name]?.fruits || []).map((fruit) => <Badge key={fruit} tone="slate">{fruit}</Badge>)}
              </div>
              <div className="mt-auto pt-4">
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-800 dark:bg-green-500/10 dark:text-green-200">
                  Delivery: {deliveryDaysText(product.delivery_days)}
                </p>
              </div>
              <div className="pt-5">
                <Button className="w-full" onClick={() => orderProduct(product.name)}><WalletCards size={18} />Order Now</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Plans({ setView, setSelectedPlanName }) {
  const [displayPlans, setDisplayPlans] = useState(plans);

  useEffect(() => {
    let cancelled = false;
    api("/plans")
      .then((data) => {
        if (!cancelled) setDisplayPlans(data);
      })
      .catch(() => {
        if (!cancelled) setDisplayPlans(plans);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function subscribe(planName) {
    setSelectedPlanName(planName);
    setView("register");
  }

  return (
    <Section id="plans" className="bg-slate-50 dark:bg-slate-900/50">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Subscription Plans</Badge>
          <h2 className="mt-4 text-3xl font-extrabold text-brand-ink sm:text-4xl dark:text-white">Choose your monthly bowl program</h2>
        </div>
        <p className="max-w-xl text-slate-600 dark:text-slate-300">Every plan includes delivery days, fruit composition, optional add-ons, invoice tracking, and renewal reminders.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {displayPlans.map((plan) => (
          <div key={plan.id || plan.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="aspect-[16/9] overflow-hidden">
              <img src={planImage(plan)} alt={`${plan.name} product`} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone={plan.goal === "Weight Loss" ? "green" : "orange"}>{plan.goal}</Badge>
                <h3 className="mt-3 text-2xl font-extrabold text-brand-ink dark:text-white">{plan.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 line-through">₹{plan.price}</p>
                <p className="text-3xl font-extrabold text-brand-green">₹{plan.final_price}</p>
              </div>
            </div>
            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{plan.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {plan.fruits_included.map((fruit) => <Badge key={fruit} tone="slate">{fruit}</Badge>)}
            </div>
            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
              <p className="text-sm font-bold text-brand-ink dark:text-white">Optional add-ons</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {plan.optional_addons.map((addon) => <span key={addon} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Check size={16} className="text-brand-green" />{addon}</span>)}
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-800 dark:bg-green-500/10 dark:text-green-200">Delivery: {deliveryDaysText(plan.delivery_days)}</p>
            <Button className="mt-6 w-full" onClick={() => subscribe(plan.name)}><WalletCards size={18} />Subscribe</Button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function LandingPage({ setView, setSelectedPlanName }) {
  return (
    <>
      <Hero setView={setView} />
      <ProductCards setView={setView} setSelectedPlanName={setSelectedPlanName} />
      <Testimonials />
      <Faq />
      <Contact />
    </>
  );
}

function Testimonials() {
  return (
    <Section className="bg-brand-ink text-white dark:bg-slate-950">
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["The weekday delivery rhythm made eating well effortless.", "Priya R."],
          ["The gain plan felt premium and practical, especially with dry fruits.", "Kabir M."],
          ["I loved seeing my goal progress beside my subscription.", "Ananya S."]
        ].map(([quote, name]) => (
          <div key={name} className="rounded-xl border border-white/10 bg-white/8 p-6">
            <p className="leading-7 text-white/90">“{quote}”</p>
            <p className="mt-4 font-bold">{name}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Faq() {
  const faqs = [
    ["Do you deliver every day?", "Plans deliver Monday to Friday, with pause and resume controls."],
    ["Can I customize bowls?", "Yes. Customers can choose add-ons and record allergies or dietary preferences."],
    ["Which payments are supported?", "UPI, PhonePe, Google Pay, Razorpay, invoices, and reminders are modeled."]
  ];
  return (
    <Section>
      <h2 className="text-3xl font-extrabold text-brand-ink dark:text-white">FAQ</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {faqs.map(([q, a]) => <div key={q} className="rounded-xl border border-slate-200 p-5 dark:border-white/10"><h3 className="font-bold text-brand-ink dark:text-white">{q}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{a}</p></div>)}
      </div>
    </Section>
  );
}

function Contact() {
  return (
    <Section id="contact" className="bg-slate-50 dark:bg-slate-900/50">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <Badge>Contact Us</Badge>
          <h2 className="mt-4 text-3xl font-extrabold text-brand-ink dark:text-white">Fresh bowls, clear operations, friendly support</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Use the form to capture leads or wire it to your CRM/support ticket route.</p>
        </div>
        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
          <input className="input" placeholder="Full name" />
          <input className="input" placeholder="Mobile number" />
          <input className="input" placeholder="Email" />
          <textarea className="input min-h-28" placeholder="How can we help?" />
          <Button type="button"><MessageCircle size={18} />Send Message</Button>
        </form>
      </div>
    </Section>
  );
}

function Login({ setUser, setView }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [resetForm, setResetForm] = useState({ email: "", new_password: "" });
  const [resetStatus, setResetStatus] = useState("");
  const [showReset, setShowReset] = useState(false);

  const finishLogin = useCallback((data) => {
    localStorage.setItem("bite_token", data.access_token);
    localStorage.setItem("bite_user", JSON.stringify(data.user));
    setUser(data.user);
    setView(`${data.user.role}-dashboard`);
  }, [setUser, setView]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      finishLogin(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    setResetStatus("Updating password...");
    try {
      const data = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(resetForm)
      });
      setForm((current) => ({ ...current, email: resetForm.email, password: "" }));
      setResetForm({ email: resetForm.email, new_password: "" });
      setResetStatus(data.message);
    } catch (err) {
      setResetStatus(err.message);
    }
  }

  return (
    <Section>
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
        <Badge>Secure Login</Badge>
        <h1 className="mt-4 text-3xl font-extrabold text-brand-ink dark:text-white">Welcome back</h1>
        <form onSubmit={submit} className="mt-6 grid gap-3">
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
          {error && <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">{error}</p>}
          <Button type="submit"><ShieldCheck size={18} />Login</Button>
        </form>
        <div className="mt-4">
          <button
            className="text-sm font-semibold text-brand-green"
            onClick={() => {
              setShowReset((current) => !current);
              setResetForm((current) => ({ ...current, email: current.email || form.email }));
              setResetStatus("");
            }}
          >
            Forgot password?
          </button>
        </div>
        {showReset && (
          <form onSubmit={submitPasswordReset} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
            <input
              className="input"
              required
              type="email"
              value={resetForm.email}
              onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })}
              placeholder="Registered email"
            />
            <input
              className="input"
              required
              type="password"
              minLength={8}
              value={resetForm.new_password}
              onChange={(event) => setResetForm({ ...resetForm, new_password: event.target.value })}
              placeholder="New password"
            />
            {resetStatus && <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">{resetStatus}</p>}
            <Button type="submit"><ShieldCheck size={18} />Update Password</Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
          New customer?{" "}
          <button className="font-semibold text-brand-green" onClick={() => setView("register")}>
            Create an account
          </button>
        </p>
      </div>
    </Section>
  );
}

function Register({ setUser, setView, selectedPlanName, setSelectedPlanName }) {
  const [availablePlans, setAvailablePlans] = useState(plans);
  const initialPlan = plans.find((plan) => plan.name === selectedPlanName) || plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan?.id || 1);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [selectedAddons, setSelectedAddons] = useState(["Sprouts"]);
  const [gpsLocation, setGpsLocation] = useState("");
  const [locationStatus, setLocationStatus] = useState("Enter your location manually, or fetch it when using HTTPS.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerStatus, setRegisterStatus] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    whatsapp_number: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    goal_weight_kg: "",
    delivery_address: "",
    dietary_preferences: "",
    allergies: ""
  });

  useEffect(() => {
    let cancelled = false;
    api("/plans")
      .then((data) => {
        if (!cancelled) {
          setAvailablePlans(data);
          const selectedPlan = data.find((plan) => plan.name === selectedPlanName);
          setSelectedPlanId(selectedPlan?.id || data[0]?.id || 1);
        }
      })
      .catch(() => {
        if (!cancelled) setRegisterStatus("Using offline plan data. Start backend to save registration.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlanName]);

  const getLocationName = useCallback(async (latitude, longitude) => {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: latitude,
      lon: longitude,
      zoom: "18",
      addressdetails: "1"
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Location lookup failed");
    }
    const data = await response.json();
    return data.display_name || `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }, []);

  const fetchLocation = useCallback(() => {
    if (!window.isSecureContext) {
      setLocationStatus("Automatic location needs HTTPS. Enter your area, landmark, or map link manually.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported by this browser. Enter location manually.");
      return;
    }

    setLocationStatus("Fetching your current location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const locationName = await getLocationName(latitude, longitude);
          setGpsLocation(locationName);
          setLocationStatus("Location name fetched successfully.");
        } catch {
          setGpsLocation(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
          setLocationStatus("Location name lookup failed, so coordinates were added.");
        }
      },
      () => {
        setLocationStatus("Location permission was blocked. Enter location manually.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [getLocationName]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAddon(addon) {
    setSelectedAddons((current) => (
      current.includes(addon) ? current.filter((item) => item !== addon) : [...current, addon]
    ));
  }

  function csvToList(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  async function submitRegistration(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setRegisterStatus("Creating customer...");

    try {
      const registered = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          mobile_number: form.mobile_number
        })
      });

      localStorage.setItem("bite_token", registered.access_token);
      localStorage.setItem("bite_user", JSON.stringify(registered.user));
      setUser(registered.user);
      setRegisterStatus("Saving health profile...");

      await api("/profiles/me", {
        method: "POST",
        body: JSON.stringify({
          whatsapp_number: form.whatsapp_number || form.mobile_number,
          delivery_address: form.delivery_address,
          gps_location: gpsLocation,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          height_cm: form.height_cm ? Number(form.height_cm) : null,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
          goal_weight_kg: form.goal_weight_kg ? Number(form.goal_weight_kg) : null,
          dietary_preferences: csvToList(form.dietary_preferences),
          allergies: csvToList(form.allergies)
        })
      });

      setRegisterStatus("Activating subscription...");
      const today = new Date().toISOString().slice(0, 10);
      const subscription = await api("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          plan_id: Number(selectedPlanId),
          selected_addons: selectedAddons,
          start_date: today
        })
      });
      setSelectedPlanName(subscription.plan?.name || availablePlans.find((plan) => plan.id === Number(selectedPlanId))?.name || selectedPlanName);

      setRegisterStatus(`Registration complete. Continue with ${paymentMethod} payment.`);
      setView("payment");
    } catch (error) {
      setRegisterStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Section>
      <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <Badge tone="orange">Customer Registration</Badge>
          <h1 className="mt-4 text-4xl font-extrabold text-brand-ink dark:text-white">Start your subscription</h1>
          <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">Collect health details, dietary preferences, add-ons, delivery location, and payment readiness in one flow.</p>
        </div>
        <form onSubmit={submitRegistration} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" required value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} placeholder="Full Name" />
            <input className="input" required value={form.mobile_number} onChange={(event) => updateField("mobile_number", event.target.value)} placeholder="Mobile Number" />
            <input className="input" value={form.whatsapp_number} onChange={(event) => updateField("whatsapp_number", event.target.value)} placeholder="WhatsApp Number" />
            <input className="input" required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="Email" />
            <input className="input" required type="password" minLength={8} value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Password" />
            <input className="input" type="number" value={form.age} onChange={(event) => updateField("age", event.target.value)} placeholder="Age" />
            <select className="input" value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
              <option value="">Gender</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
            <input className="input" type="number" value={form.height_cm} onChange={(event) => updateField("height_cm", event.target.value)} placeholder="Height (cm)" />
            <input className="input" type="number" value={form.weight_kg} onChange={(event) => updateField("weight_kg", event.target.value)} placeholder="Weight (kg)" />
            <input className="input" type="number" value={form.goal_weight_kg} onChange={(event) => updateField("goal_weight_kg", event.target.value)} placeholder="Goal Weight (kg)" />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="input"
                value={gpsLocation}
                onChange={(event) => {
                  setGpsLocation(event.target.value);
                  setLocationStatus("Location updated manually.");
                }}
                placeholder="Area, landmark, or Google Maps link"
              />
              <Button type="button" variant="outline" className="shrink-0" onClick={fetchLocation}>
                <LocateFixed size={18} />
                Fetch Location
              </Button>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{locationStatus}</p>
          </div>
          <textarea className="input min-h-24" required value={form.delivery_address} onChange={(event) => updateField("delivery_address", event.target.value)} placeholder="Delivery Address" />
          <div className="grid gap-3 md:grid-cols-2">
            <select className="input" value={selectedPlanId} onChange={(event) => setSelectedPlanId(Number(event.target.value))}>{availablePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
            <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>UPI</option><option>PhonePe</option><option>Google Pay</option><option>Razorpay</option></select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" value={form.dietary_preferences} onChange={(event) => updateField("dietary_preferences", event.target.value)} placeholder="Dietary Preferences, comma separated" />
            <input className="input" value={form.allergies} onChange={(event) => updateField("allergies", event.target.value)} placeholder="Allergies, comma separated" />
          </div>
          <div className="flex flex-wrap gap-2">{["Boiled Eggs", "Sprouts", "Dry Fruits", "Protein Mix"].map((addon) => <label key={addon} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10"><input type="checkbox" checked={selectedAddons.includes(addon)} onChange={() => toggleAddon(addon)} />{addon}</label>)}</div>
          {registerStatus && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-200">{registerStatus}</p>}
          <Button type="submit" disabled={isSubmitting}><CreditCard size={18} />{isSubmitting ? "Registering..." : "Register and Continue to Payment"}</Button>
        </form>
      </div>
    </Section>
  );
}

function Metric({ icon: Icon, label, value, tone = "green", onClick }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white p-5 text-left dark:border-white/10 dark:bg-slate-900 ${onClick ? "transition hover:border-brand-green hover:shadow-soft" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${tone === "orange" ? "bg-orange-100 text-brand-orange" : "bg-green-100 text-brand-green"}`}><Icon size={20} /></span>
        <span className="text-2xl font-extrabold text-brand-ink dark:text-white">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </Component>
  );
}

function AdminDashboard({ initialPanel = "" }) {
  const [dashboard, setDashboard] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [adminPlans, setAdminPlans] = useState(plans);
  const [productEdits, setProductEdits] = useState({});
  const defaultAdminPlanId = String(plans.find((plan) => plan.name === "Medium Bowl")?.id || plans[0]?.id || "");
  const [memberForm, setMemberForm] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    password: "",
    role: "customer"
  });
  const [customerForm, setCustomerForm] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    password: "",
    whatsapp_number: "",
    delivery_address: "",
    gps_location: "",
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    goal_weight_kg: "",
    dietary_preferences: "",
    allergies: "",
    plan_id: defaultAdminPlanId,
    selected_addons: "",
    start_date: new Date().toISOString().slice(0, 10)
  });
  const [productForm, setProductForm] = useState({
    name: "",
    goal: "",
    description: "",
    duration_days: "30",
    delivery_days: "Monday, Tuesday, Wednesday, Thursday, Friday",
    fruits_included: "",
    optional_addons: "",
    price: "",
    discount: "0",
    final_price: "",
    image_data: "",
    is_active: true
  });
  const [adminStatus, setAdminStatus] = useState("");
  const selectedProductId = Number(new URLSearchParams(window.location.search).get("productId") || 0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api("/admin/dashboard"), api("/admin/plans")])
      .then(([dashboardData, plansData]) => {
        if (!cancelled) {
          setDashboard(dashboardData);
          setAdminPlans(plansData);
          if (!plansData.some((plan) => String(plan.id) === customerForm.plan_id)) {
            const mediumPlan = plansData.find((plan) => plan.name === "Medium Bowl") || plansData[0];
            setCustomerForm((current) => ({ ...current, plan_id: mediumPlan ? String(mediumPlan.id) : "" }));
          }
          setAdminStatus("");
        }
      })
      .catch((error) => {
        if (!cancelled) setAdminStatus(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialPanel === "products" || initialPanel === "product-detail") {
      loadProducts();
    }
  }, [initialPanel]);

  async function loadSubscriptions() {
    setShowSubscriptions(true);
    setAdminStatus("Loading subscriptions...");
    try {
      const data = await api("/admin/subscriptions");
      setSubscriptions(data);
      setAdminStatus("");
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function loadInventory() {
    setShowInventory(true);
    setAdminStatus("Loading stock...");
    try {
      const data = await api("/admin/inventory");
      setInventory(data);
      setAdminStatus("");
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function loadProducts() {
    setShowProducts(true);
    setAdminStatus("Loading products...");
    try {
      const data = await api("/admin/plans");
      setAdminPlans(data);
      setProductEdits(data.reduce((edits, plan) => ({ ...edits, [plan.id]: productToForm(plan) }), {}));
      setAdminStatus("");
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  function openProductManagement() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "admin-products");
    url.searchParams.delete("productId");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  function openProductDetails(planId) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "admin-product-detail");
    url.searchParams.set("productId", String(planId));
    window.location.href = url.toString();
  }

  async function updateInventoryAvailability(inventoryId, availabilityStatus) {
    setAdminStatus("Updating stock...");
    try {
      const updated = await api(`/admin/inventory/${inventoryId}/availability`, {
        method: "PATCH",
        body: JSON.stringify({ availability_status: availabilityStatus })
      });
      setInventory((current) => current.map((item) => item.id === inventoryId ? updated : item));
      const refreshed = await api("/admin/dashboard");
      setDashboard(refreshed);
      setAdminStatus(`${updated.item_name} marked ${availabilityStatus === "soldout" ? "sold out" : "available"}.`);
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function updateSubscriptionStatus(subscriptionId, action) {
    const actionLabel = action === "resume" ? "Resuming" : action === "complete" ? "Completing" : "Pausing";
    setAdminStatus(`${actionLabel} subscription...`);
    try {
      await api(`/subscriptions/${subscriptionId}/${action}`, { method: "PATCH" });
      await loadSubscriptions();
      const refreshed = await api("/admin/dashboard");
      setDashboard(refreshed);
      setAdminStatus(`Subscription ${action === "resume" ? "resumed" : action === "complete" ? "completed" : "paused"}.`);
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function markPaymentPaid(paymentId) {
    setAdminStatus("Marking payment as paid...");
    try {
      await api(`/payments/${paymentId}/mark-paid`, { method: "PATCH" });
      await loadSubscriptions();
      const refreshed = await api("/admin/dashboard");
      setDashboard(refreshed);
      setAdminStatus("Payment marked as paid.");
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function createMember(event) {
    event.preventDefault();
    setAdminStatus("Adding member...");
    try {
      const created = await api("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...memberForm,
          mobile_number: memberForm.mobile_number || null
        })
      });
      setMemberForm({ full_name: "", email: "", mobile_number: "", password: "", role: "customer" });
      const refreshed = await api("/admin/dashboard");
      setDashboard(refreshed);
      setAdminStatus(`${created.full_name} added as ${created.role}.`);
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  function csvToList(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  function productToForm(product) {
    return {
      name: product.name || "",
      goal: product.goal || "",
      description: product.description || "",
      duration_days: String(product.duration_days || 30),
      delivery_days: (product.delivery_days || []).join(", "),
      fruits_included: (product.fruits_included || []).join(", "),
      optional_addons: (product.optional_addons || []).join(", "),
      price: String(product.price ?? ""),
      discount: String(product.discount ?? 0),
      final_price: String(product.final_price ?? ""),
      image_data: product.image_url || "",
      is_active: Boolean(product.is_active)
    };
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read product image"));
      reader.readAsDataURL(file);
    });
  }

  async function updateProductImage(file) {
    if (!file) {
      setProductForm((current) => ({ ...current, image_data: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAdminStatus("Please upload an image file.");
      return;
    }
    if (file.size > 750 * 1024) {
      setAdminStatus("Product image must be 750 KB or smaller.");
      return;
    }
    try {
      const imageData = await readImageFile(file);
      setProductForm((current) => ({ ...current, image_data: imageData }));
      setAdminStatus("");
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function updateExistingProductImage(planId, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAdminStatus("Please upload an image file.");
      return;
    }
    if (file.size > 750 * 1024) {
      setAdminStatus("Product image must be 750 KB or smaller.");
      return;
    }
    try {
      const imageData = await readImageFile(file);
      setProductEdits((current) => ({
        ...current,
        [planId]: { ...current[planId], image_data: imageData }
      }));
      setAdminStatus("");
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    setAdminStatus("Adding customer...");
    try {
      const created = await api("/admin/customers", {
        method: "POST",
        body: JSON.stringify({
          full_name: customerForm.full_name,
          email: customerForm.email,
          mobile_number: customerForm.mobile_number || null,
          password: customerForm.password,
          whatsapp_number: customerForm.whatsapp_number || customerForm.mobile_number || null,
          delivery_address: customerForm.delivery_address,
          gps_location: customerForm.gps_location || null,
          age: customerForm.age ? Number(customerForm.age) : null,
          gender: customerForm.gender || null,
          height_cm: customerForm.height_cm ? Number(customerForm.height_cm) : null,
          weight_kg: customerForm.weight_kg ? Number(customerForm.weight_kg) : null,
          goal_weight_kg: customerForm.goal_weight_kg ? Number(customerForm.goal_weight_kg) : null,
          dietary_preferences: csvToList(customerForm.dietary_preferences),
          allergies: csvToList(customerForm.allergies),
          plan_id: customerForm.plan_id ? Number(customerForm.plan_id) : null,
          selected_addons: csvToList(customerForm.selected_addons),
          start_date: customerForm.start_date || null
        })
      });
      setCustomerForm({
        full_name: "",
        email: "",
        mobile_number: "",
        password: "",
        whatsapp_number: "",
        delivery_address: "",
        gps_location: "",
        age: "",
        gender: "",
        height_cm: "",
        weight_kg: "",
        goal_weight_kg: "",
        dietary_preferences: "",
        allergies: "",
        plan_id: defaultAdminPlanId,
        selected_addons: "",
        start_date: new Date().toISOString().slice(0, 10)
      });
      const refreshed = await api("/admin/dashboard");
      setDashboard(refreshed);
      setAdminStatus(`${created.user.full_name} added as customer${created.subscription ? ` with ${created.subscription.plan.name}` : ""}.`);
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function createProduct(event) {
    event.preventDefault();
    setAdminStatus("Adding product...");
    try {
      const created = await api("/admin/plans", {
        method: "POST",
        body: JSON.stringify({
          name: productForm.name,
          goal: productForm.goal,
          description: productForm.description,
          duration_days: Number(productForm.duration_days),
          delivery_days: csvToList(productForm.delivery_days),
          fruits_included: csvToList(productForm.fruits_included),
          optional_addons: csvToList(productForm.optional_addons),
          price: Number(productForm.price),
          discount: productForm.discount ? Number(productForm.discount) : 0,
          final_price: productForm.final_price ? Number(productForm.final_price) : null,
          image_url: productForm.image_data || null,
          is_active: productForm.is_active
        })
      });
      const plansData = await api("/admin/plans");
      setAdminPlans(plansData);
      setProductEdits(plansData.reduce((edits, plan) => ({ ...edits, [plan.id]: productToForm(plan) }), {}));
      setProductForm({
        name: "",
        goal: "",
        description: "",
        duration_days: "30",
        delivery_days: "Monday, Tuesday, Wednesday, Thursday, Friday",
        fruits_included: "",
        optional_addons: "",
        price: "",
        discount: "0",
        final_price: "",
        image_data: "",
        is_active: true
      });
      const message = `${created.name} added successfully.`;
      setAdminStatus(message);
      window.alert(message);
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function updateProduct(planId) {
    const form = productEdits[planId];
    if (!form) {
      setAdminStatus("Product details are still loading. Please try again.");
      return;
    }
    if (!form.name || !form.goal || !form.description || !form.duration_days || !form.price) {
      setAdminStatus("Please fill product name, type, description, duration, and price before saving.");
      return;
    }
    setAdminStatus("Updating product...");
    try {
      const updated = await api(`/admin/plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          goal: form.goal,
          description: form.description,
          duration_days: Number(form.duration_days),
          delivery_days: csvToList(form.delivery_days),
          fruits_included: csvToList(form.fruits_included),
          optional_addons: csvToList(form.optional_addons),
          price: Number(form.price),
          discount: form.discount ? Number(form.discount) : 0,
          final_price: form.final_price ? Number(form.final_price) : null,
          image_url: form.image_data || null,
          is_active: form.is_active
        })
      });
      const plansData = await api("/admin/plans");
      setAdminPlans(plansData);
      setProductEdits(plansData.reduce((edits, plan) => ({ ...edits, [plan.id]: productToForm(plan) }), {}));
      const message = `${updated.name} updated successfully.`;
      setAdminStatus(message);
      window.alert(message);
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  async function deleteProduct(planId) {
    const product = adminPlans.find((item) => item.id === planId);
    const productName = product?.name || "Product";
    if (!window.confirm(`Delete ${productName}? If customers use it, it will be deactivated instead.`)) {
      return;
    }
    setAdminStatus("Deleting product...");
    try {
      const result = await api(`/admin/plans/${planId}`, { method: "DELETE" });
      const plansData = await api("/admin/plans");
      setAdminPlans(plansData);
      setProductEdits(plansData.reduce((edits, plan) => ({ ...edits, [plan.id]: productToForm(plan) }), {}));
      setAdminStatus(result.message);
      window.alert(result.message);
      if (result.deleted) {
        const url = new URL(window.location.href);
        url.searchParams.set("view", "admin-products");
        url.searchParams.delete("productId");
        window.location.href = url.toString();
      }
    } catch (error) {
      setAdminStatus(error.message);
    }
  }

  const successRate = dashboard?.delivery_success_rate ?? 0;
  const lowStockItems = dashboard?.low_stock_alerts?.length
    ? dashboard.low_stock_alerts.map((item) => `${item.item_name}: ${item.quantity} ${item.unit}`)
    : ["No low stock alerts"];
  const endingSoonItems = dashboard?.subscriptions_ending_soon?.length
    ? dashboard.subscriptions_ending_soon.map((item) => `${item.customer_name} - ${item.plan_name} ends ${item.end_date} (${item.days_remaining} days left)`)
    : ["No subscriptions ending in the next 5 days"];
  const activeProductCounts = dashboard?.active_customers_by_product || [];
  const isProductPage = initialPanel === "products";
  const isProductDetailPage = initialPanel === "product-detail";
  const selectedProduct = adminPlans.find((product) => product.id === selectedProductId);
  const selectedProductEdit = selectedProduct ? (productEdits[selectedProduct.id] || productToForm(selectedProduct)) : null;

  return (
    <DashboardShell
      title={isProductPage || isProductDetailPage ? "Product Management" : "Admin Dashboard"}
      subtitle={isProductPage || isProductDetailPage ? "View products, then update or delete selected product details." : "Revenue, subscriptions, delivery, inventory, and customer growth."}
    >
      {!isProductPage && !isProductDetailPage && (
        <>
      <div className="grid gap-4 md:grid-cols-5">
        <Metric icon={WalletCards} label="Total Revenue" value={formatCurrency(dashboard?.total_paid_revenue)} />
        <Metric icon={WalletCards} label="Current Month Revenue" value={formatCurrency(dashboard?.monthly_recurring_revenue)} />
        <Metric icon={User} label="Total Customers" value={dashboard?.total_customers ?? 0} tone="orange" />
        <Metric icon={Package} label="Active Subscriptions" value={dashboard?.active_subscriptions ?? 0} onClick={loadSubscriptions} />
        <Metric icon={Bike} label="Delivery Success Rate" value={`${successRate}%`} tone="orange" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {activeProductCounts.map((item) => (
          <div key={item.product_name} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Active Customers</p>
                <h3 className="mt-2 text-lg font-extrabold text-brand-ink dark:text-white">{item.product_name}</h3>
                {item.goal && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.goal}</p>}
              </div>
              <span className="text-3xl font-extrabold text-brand-green">{item.active_customers}</span>
            </div>
          </div>
        ))}
        {!activeProductCounts.length && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
            No active customers by product yet.
          </div>
        )}
      </div>
      {adminStatus && <p className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">{adminStatus}</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={loadInventory}><Package size={18} />Manage Stock</Button>
        <Button variant="outline" onClick={openProductManagement}><Package size={18} />Manage Products</Button>
      </div>
      <form onSubmit={createMember} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">Add Member</h2>
          <Badge tone="orange">Admin Access</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input className="input" required value={memberForm.full_name} onChange={(event) => setMemberForm({ ...memberForm, full_name: event.target.value })} placeholder="Full name" />
          <input className="input" required type="email" value={memberForm.email} onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })} placeholder="Email" />
          <input className="input" value={memberForm.mobile_number} onChange={(event) => setMemberForm({ ...memberForm, mobile_number: event.target.value })} placeholder="Mobile number" />
          <input className="input" required type="password" minLength={8} value={memberForm.password} onChange={(event) => setMemberForm({ ...memberForm, password: event.target.value })} placeholder="Password" />
          <select className="input" value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}>
            <option value="customer">Customer</option>
            <option value="delivery_partner">Delivery Partner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button type="submit"><User size={18} />Add Member</Button>
      </form>
      <form onSubmit={createCustomer} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">Add Customer</h2>
          <Badge>Customer Profile</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input className="input" required value={customerForm.full_name} onChange={(event) => setCustomerForm({ ...customerForm, full_name: event.target.value })} placeholder="Full name" />
          <input className="input" required type="email" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} placeholder="Email" />
          <input className="input" value={customerForm.mobile_number} onChange={(event) => setCustomerForm({ ...customerForm, mobile_number: event.target.value })} placeholder="Mobile number" />
          <input className="input" required type="password" minLength={8} value={customerForm.password} onChange={(event) => setCustomerForm({ ...customerForm, password: event.target.value })} placeholder="Password" />
          <select className="input" value={customerForm.plan_id} onChange={(event) => setCustomerForm({ ...customerForm, plan_id: event.target.value })}>
            <option value="">No product yet</option>
            {adminPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.final_price)}</option>
            ))}
          </select>
          <input className="input" type="date" value={customerForm.start_date} onChange={(event) => setCustomerForm({ ...customerForm, start_date: event.target.value })} />
          <input className="input" value={customerForm.selected_addons} onChange={(event) => setCustomerForm({ ...customerForm, selected_addons: event.target.value })} placeholder="Selected add-ons, comma separated" />
          <input className="input" value={customerForm.whatsapp_number} onChange={(event) => setCustomerForm({ ...customerForm, whatsapp_number: event.target.value })} placeholder="WhatsApp number" />
          <input className="input" required value={customerForm.delivery_address} onChange={(event) => setCustomerForm({ ...customerForm, delivery_address: event.target.value })} placeholder="Delivery address" />
          <input className="input" value={customerForm.gps_location} onChange={(event) => setCustomerForm({ ...customerForm, gps_location: event.target.value })} placeholder="GPS/location link" />
          <select className="input" value={customerForm.gender} onChange={(event) => setCustomerForm({ ...customerForm, gender: event.target.value })}>
            <option value="">Gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
          <input className="input" type="number" min="1" value={customerForm.age} onChange={(event) => setCustomerForm({ ...customerForm, age: event.target.value })} placeholder="Age" />
          <input className="input" type="number" min="1" step="0.1" value={customerForm.height_cm} onChange={(event) => setCustomerForm({ ...customerForm, height_cm: event.target.value })} placeholder="Height cm" />
          <input className="input" type="number" min="1" step="0.1" value={customerForm.weight_kg} onChange={(event) => setCustomerForm({ ...customerForm, weight_kg: event.target.value })} placeholder="Weight kg" />
          <input className="input" type="number" min="1" step="0.1" value={customerForm.goal_weight_kg} onChange={(event) => setCustomerForm({ ...customerForm, goal_weight_kg: event.target.value })} placeholder="Goal weight kg" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" value={customerForm.dietary_preferences} onChange={(event) => setCustomerForm({ ...customerForm, dietary_preferences: event.target.value })} placeholder="Dietary preferences, comma separated" />
          <input className="input" value={customerForm.allergies} onChange={(event) => setCustomerForm({ ...customerForm, allergies: event.target.value })} placeholder="Allergies, comma separated" />
        </div>
        <Button type="submit"><User size={18} />Add Customer</Button>
      </form>
      <form onSubmit={createProduct} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">Add Product</h2>
          <Badge tone="orange">Dynamic Product</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input className="input" required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Product name" />
          <input className="input" required value={productForm.goal} onChange={(event) => setProductForm({ ...productForm, goal: event.target.value })} placeholder="Product type / goal" />
          <input className="input" required type="number" min="1" value={productForm.duration_days} onChange={(event) => setProductForm({ ...productForm, duration_days: event.target.value })} placeholder="Duration days" />
          <input className="input" required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="Original price" />
          <input className="input" type="number" min="0" step="0.01" value={productForm.discount} onChange={(event) => setProductForm({ ...productForm, discount: event.target.value })} placeholder="Discount" />
          <input className="input" type="number" min="0" step="0.01" value={productForm.final_price} onChange={(event) => setProductForm({ ...productForm, final_price: event.target.value })} placeholder="Final price" />
          <input className="input" value={productForm.delivery_days} onChange={(event) => setProductForm({ ...productForm, delivery_days: event.target.value })} placeholder="Delivery days, comma separated" />
          <input className="input" required type="file" accept="image/*" onChange={(event) => updateProductImage(event.target.files?.[0])} />
        </div>
        {productForm.image_data && (
          <div className="max-w-sm overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
            <img src={productForm.image_data} alt="Product preview" className="h-40 w-full object-cover" />
          </div>
        )}
        <textarea className="input min-h-24" required value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Product description" />
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" required value={productForm.fruits_included} onChange={(event) => setProductForm({ ...productForm, fruits_included: event.target.value })} placeholder="Ingredients, comma separated" />
          <input className="input" value={productForm.optional_addons} onChange={(event) => setProductForm({ ...productForm, optional_addons: event.target.value })} placeholder="Optional add-ons, comma separated" />
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={productForm.is_active} onChange={(event) => setProductForm({ ...productForm, is_active: event.target.checked })} />
          Active product
        </label>
        <Button type="submit"><Package size={18} />Add Product</Button>
      </form>
        </>
      )}
      {isProductPage && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">All Products</h2>
            <Button variant="outline" onClick={loadProducts}>Refresh</Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Active Status</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {adminPlans.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-bold text-brand-ink dark:text-white">{product.name}</td>
                    <td className="px-4 py-3"><Badge tone={product.is_active ? "green" : "orange"}>{product.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(product.final_price)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{deliveryDaysText(product.delivery_days)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => openProductDetails(product.id)}>Update</Button>
                        <Button variant="outline" onClick={() => openProductDetails(product.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!adminPlans.length && <p className="rounded-lg bg-white p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">No products found.</p>}
        </div>
      )}
      {isProductDetailPage && selectedProduct && selectedProductEdit && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">{selectedProduct.name}</h2>
            <Button variant="outline" onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("view", "admin-products");
              url.searchParams.delete("productId");
              window.location.href = url.toString();
            }}>Back to Products</Button>
          </div>
          {(() => {
            const edit = selectedProductEdit;
            const updateEdit = (changes) => setProductEdits((current) => ({
              ...current,
              [selectedProduct.id]: { ...edit, ...changes }
            }));
            return (
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge tone={edit.is_active ? "green" : "orange"}>{edit.is_active ? "Active" : "Inactive"}</Badge>
                    <h3 className="mt-3 text-lg font-extrabold text-brand-ink dark:text-white">Selected Product Info</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(selectedProduct.final_price)} | {deliveryDaysText(selectedProduct.delivery_days)}</p>
                  </div>
                  <div className="h-28 w-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                    <img src={edit.image_data || planImage(selectedProduct)} alt={`${selectedProduct.name} preview`} className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <input className="input" required value={edit.name} onChange={(event) => updateEdit({ name: event.target.value })} placeholder="Product name" />
                  <input className="input" required value={edit.goal} onChange={(event) => updateEdit({ goal: event.target.value })} placeholder="Product type / goal" />
                  <input className="input" required type="number" min="1" value={edit.duration_days} onChange={(event) => updateEdit({ duration_days: event.target.value })} placeholder="Duration days" />
                  <input className="input" required type="number" min="0" step="0.01" value={edit.price} onChange={(event) => updateEdit({ price: event.target.value })} placeholder="Original price" />
                  <input className="input" type="number" min="0" step="0.01" value={edit.discount} onChange={(event) => updateEdit({ discount: event.target.value })} placeholder="Discount" />
                  <input className="input" type="number" min="0" step="0.01" value={edit.final_price} onChange={(event) => updateEdit({ final_price: event.target.value })} placeholder="Final price" />
                  <input className="input" value={edit.delivery_days} onChange={(event) => updateEdit({ delivery_days: event.target.value })} placeholder="Delivery days, comma separated" />
                  <input className="input" type="file" accept="image/*" onChange={(event) => updateExistingProductImage(selectedProduct.id, event.target.files?.[0])} />
                </div>
                <textarea className="input min-h-24" required value={edit.description} onChange={(event) => updateEdit({ description: event.target.value })} placeholder="Product description" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="input" required value={edit.fruits_included} onChange={(event) => updateEdit({ fruits_included: event.target.value })} placeholder="Ingredients, comma separated" />
                  <input className="input" value={edit.optional_addons} onChange={(event) => updateEdit({ optional_addons: event.target.value })} placeholder="Optional add-ons, comma separated" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={edit.is_active} onChange={(event) => updateEdit({ is_active: event.target.checked })} />
                    Active product
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => updateProduct(selectedProduct.id)}><Package size={18} />Save Product</Button>
                    <Button variant="outline" onClick={() => deleteProduct(selectedProduct.id)}>Delete Product</Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {isProductDetailPage && !selectedProduct && (
        <p className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">Product not found. Go back to product list and choose a product.</p>
      )}
      {false && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">Product Details</h2>
            <Button variant="outline" onClick={loadProducts}>Refresh</Button>
          </div>
          {adminPlans.map((product) => {
            const edit = productEdits[product.id] || productToForm(product);
            const updateEdit = (changes) => setProductEdits((current) => ({
              ...current,
              [product.id]: { ...edit, ...changes }
            }));
            return (
              <div key={product.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge tone={edit.is_active ? "green" : "orange"}>{edit.is_active ? "Active" : "Inactive"}</Badge>
                    <h3 className="mt-3 text-lg font-extrabold text-brand-ink dark:text-white">{product.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(product.final_price)} · {deliveryDaysText(product.delivery_days)}</p>
                  </div>
                  <div className="h-28 w-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                    <img src={edit.image_data || planImage(product)} alt={`${product.name} preview`} className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <input className="input" required value={edit.name} onChange={(event) => updateEdit({ name: event.target.value })} placeholder="Product name" />
                  <input className="input" required value={edit.goal} onChange={(event) => updateEdit({ goal: event.target.value })} placeholder="Product type / goal" />
                  <input className="input" required type="number" min="1" value={edit.duration_days} onChange={(event) => updateEdit({ duration_days: event.target.value })} placeholder="Duration days" />
                  <input className="input" required type="number" min="0" step="0.01" value={edit.price} onChange={(event) => updateEdit({ price: event.target.value })} placeholder="Original price" />
                  <input className="input" type="number" min="0" step="0.01" value={edit.discount} onChange={(event) => updateEdit({ discount: event.target.value })} placeholder="Discount" />
                  <input className="input" type="number" min="0" step="0.01" value={edit.final_price} onChange={(event) => updateEdit({ final_price: event.target.value })} placeholder="Final price" />
                  <input className="input" value={edit.delivery_days} onChange={(event) => updateEdit({ delivery_days: event.target.value })} placeholder="Delivery days, comma separated" />
                  <input className="input" type="file" accept="image/*" onChange={(event) => updateExistingProductImage(product.id, event.target.files?.[0])} />
                </div>
                <textarea className="input min-h-24" required value={edit.description} onChange={(event) => updateEdit({ description: event.target.value })} placeholder="Product description" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="input" required value={edit.fruits_included} onChange={(event) => updateEdit({ fruits_included: event.target.value })} placeholder="Ingredients, comma separated" />
                  <input className="input" value={edit.optional_addons} onChange={(event) => updateEdit({ optional_addons: event.target.value })} placeholder="Optional add-ons, comma separated" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={edit.is_active} onChange={(event) => updateEdit({ is_active: event.target.checked })} />
                    Active product
                  </label>
                  <Button onClick={() => updateProduct(product.id)}><Package size={18} />Save Product</Button>
                </div>
              </div>
            );
          })}
          {!adminPlans.length && <p className="rounded-lg bg-white p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">No products found.</p>}
        </div>
      )}
      {!isProductPage && !isProductDetailPage && (
        <>
      {showInventory && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">Stock Availability</h2>
            <Button variant="outline" onClick={loadInventory}>Refresh</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {inventory.map((item) => {
              const isSoldOut = item.availability_status === "soldout";
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={isSoldOut ? "orange" : "green"}>{isSoldOut ? "Sold Out" : "Available"}</Badge>
                      <h3 className="mt-3 text-lg font-extrabold text-brand-ink dark:text-white">{item.item_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.category} · {item.quantity} {item.unit}</p>
                      {item.low_stock && <p className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-200">Low stock threshold: {item.low_stock_threshold} {item.unit}</p>}
                    </div>
                    <Package className={isSoldOut ? "text-orange-500" : "text-brand-green"} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant={isSoldOut ? "primary" : "outline"}
                      onClick={() => updateInventoryAvailability(item.id, "available")}
                    >
                      Available
                    </Button>
                    <Button
                      variant={isSoldOut ? "outline" : "primary"}
                      onClick={() => updateInventoryAvailability(item.id, "soldout")}
                    >
                      Sold Out
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {!inventory.length && <p className="rounded-lg bg-white p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">No inventory found.</p>}
        </div>
      )}
      {showSubscriptions && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">Customer Subscriptions</h2>
            <Button variant="outline" onClick={loadSubscriptions}>Refresh</Button>
          </div>
          {subscriptions.map((subscription) => (
            <div key={subscription.subscription_id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={subscription.status === "active" ? "green" : "orange"}>{humanizeStatus(subscription.status)}</Badge>
                    <span className="text-sm font-semibold text-slate-500">#{subscription.subscription_id}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-brand-ink dark:text-white">{subscription.customer.full_name || "Unknown customer"}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{subscription.customer.email} · {subscription.customer.mobile_number || "No mobile"}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subscription.profile.delivery_address || "No address saved"}</p>
                  <p className="mt-1 text-sm text-slate-500">{subscription.profile.whatsapp_number || "No WhatsApp"} · {subscription.profile.gps_location || "No location"}</p>
                </div>
                <div className="grid gap-2 text-sm lg:min-w-64">
                  <p><span className="font-bold text-brand-ink dark:text-white">Plan:</span> {subscription.plan.name} ({formatCurrency(subscription.plan.final_price)})</p>
                  <p><span className="font-bold text-brand-ink dark:text-white">Dates:</span> {subscription.start_date} to {subscription.end_date}</p>
                  <p><span className="font-bold text-brand-ink dark:text-white">Payment:</span> {subscription.payment?.status || "pending"}</p>
                  <div className="flex gap-2 pt-2">
                    {subscription.status === "completed" ? (
                      <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-800 dark:bg-green-500/10 dark:text-green-200">Completed</span>
                    ) : subscription.payment?.status === "paid" ? (
                      <Button onClick={() => updateSubscriptionStatus(subscription.subscription_id, "complete")}>Complete Plan</Button>
                    ) : subscription.payment?.id ? (
                      <Button onClick={() => markPaymentPaid(subscription.payment.id)}>Mark Paid</Button>
                    ) : (
                      <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">Awaiting payment</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!subscriptions.length && <p className="rounded-lg bg-white p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">No subscriptions found.</p>}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <ChartPanel title="Delivery Status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[{ label: "All Deliveries", success: successRate, remaining: Math.max(0, 100 - successRate) }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="success" fill="#22C55E" radius={6} /><Bar dataKey="remaining" fill="#F97316" radius={6} /></BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ListPanel title="Low Stock Alerts" items={lowStockItems} />
      </div>
      <ListPanel title="Subscriptions Ending Soon" items={endingSoonItems} />
        </>
      )}
    </DashboardShell>
  );
}

function CustomerDashboard({ user, setView }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [dashboardStatus, setDashboardStatus] = useState("");

  const loadCustomerData = useCallback(async () => {
    if (!user) {
      setDashboardStatus("Login to view your subscription.");
      return;
    }

    const [subscriptionsData, paymentsData, deliveriesData] = await Promise.all([
      api("/subscriptions/me"),
      api("/payments/me"),
      api("/deliveries/me")
    ]);
    setSubscriptions(subscriptionsData);
    setPayments(paymentsData);
    setDeliveries(deliveriesData);
    setDashboardStatus("");
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadCustomerData();
      } catch (error) {
        if (!cancelled) setDashboardStatus(error.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loadCustomerData]);

  async function renewCurrentSubscription(subscriptionId) {
    setDashboardStatus("Renewing subscription...");
    try {
      const renewed = await api(`/subscriptions/${subscriptionId}/renew`, { method: "POST" });
      setSubscriptions((current) => [...current, renewed]);
      setDashboardStatus("Subscription renewed. Continue with payment.");
      window.setTimeout(() => setView("payment"), 900);
    } catch (error) {
      setDashboardStatus(error.message);
    }
  }

  async function updateCurrentSubscription(subscriptionId, action) {
    setDashboardStatus(`${action === "pause" ? "Pausing" : "Resuming"} subscription...`);
    try {
      await api(`/subscriptions/${subscriptionId}/${action}`, { method: "PATCH" });
      await loadCustomerData();
      setDashboardStatus(`Subscription ${action === "pause" ? "paused" : "resumed"}.`);
    } catch (error) {
      setDashboardStatus(error.message);
    }
  }

  const currentSubscription =
    [...subscriptions].reverse().find((subscription) => ["active", "paused"].includes(subscription.status))
    || lastItem(subscriptions);
  const currentPlan = currentSubscription?.plan;
  const latestPayment = lastItem(payments);
  const canPause = currentSubscription?.status === "active";
  const canResume = currentSubscription?.status === "paused";
  const upcomingDeliveries = deliveries
    .filter((delivery) => delivery.status !== "delivered")
    .slice(0, 5)
    .map((delivery) => `${delivery.delivery_date}: ${humanizeStatus(delivery.status)}`);

  return (
    <DashboardShell title="Customer Dashboard" subtitle="Current plan, deliveries, payments, progress, and support.">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Apple} label="Booked Plan" value={currentPlan?.goal?.replace("Weight ", "") || "None"} />
        <Metric icon={CalendarDays} label="Deliveries Booked" value={deliveries.length || 0} tone="orange" />
        <Metric icon={LineChart} label="Goal Progress" value="35%" />
        <Metric icon={CreditCard} label="Payment Status" value={latestPayment?.status || "Pending"} tone="orange" />
      </div>
      {dashboardStatus && <p className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">{dashboardStatus}</p>}
      {currentSubscription && currentPlan && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <Badge tone={currentPlan.goal === "Weight Gain" ? "orange" : "green"}>{currentPlan.goal}</Badge>
              <h2 className="mt-3 text-2xl font-extrabold text-brand-ink dark:text-white">{currentPlan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{currentPlan.description}</p>
            </div>
            <div className="rounded-lg bg-green-50 px-4 py-3 text-right dark:bg-green-500/10">
              <p className="text-xs font-bold uppercase text-green-700 dark:text-green-200">Booked Amount</p>
              <p className="text-3xl font-extrabold text-brand-green">₹{currentPlan.final_price}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Subscription Dates</p>
              <p className="mt-1 font-semibold text-brand-ink dark:text-white">{currentSubscription.start_date} to {currentSubscription.end_date}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Subscription Status</p>
              <p className="mt-1 font-semibold capitalize text-brand-ink dark:text-white">{humanizeStatus(currentSubscription.status)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Payment Receipt</p>
              <p className="mt-1 font-semibold text-brand-ink dark:text-white">{latestPayment ? `#${latestPayment.id} · ${latestPayment.method}` : "Not paid yet"}</p>
            </div>
          </div>
          {currentSubscription.status === "completed" && (
            <Button className="mt-5" onClick={() => renewCurrentSubscription(currentSubscription.id)}>
              <CalendarDays size={18} />
              Renew Plan
            </Button>
          )}
          {(canPause || canResume) && (
            <Button
              className="mt-5"
              variant={canPause ? "outline" : "primary"}
              onClick={() => updateCurrentSubscription(currentSubscription.id, canPause ? "pause" : "resume")}
            >
              <CalendarDays size={18} />
              {canPause ? "Pause Subscription" : "Resume Subscription"}
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ChartPanel title="Weight Progress">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={progressData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis domain={[64, 74]} /><Tooltip /><Area dataKey="weight" stroke="#22C55E" fill="#DCFCE7" strokeWidth={3} /></AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ListPanel title="Upcoming Deliveries" items={upcomingDeliveries.length ? upcomingDeliveries : ["No upcoming deliveries found"]} />
      </div>
    </DashboardShell>
  );
}

function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryStatus, setDeliveryStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    api("/deliveries/me")
      .then((data) => {
        if (!cancelled) {
          setDeliveries(data);
          setDeliveryStatus("");
        }
      })
      .catch((error) => {
        if (!cancelled) setDeliveryStatus(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function markDelivered(deliveryId) {
    setDeliveryStatus("Updating delivery...");
    try {
      const updated = await api(`/deliveries/${deliveryId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "delivered", notes: "Delivered from dashboard", confirmation_photo_url: null })
      });
      setDeliveries((current) => current.map((delivery) => delivery.id === updated.id ? updated : delivery));
      setDeliveryStatus("Delivery marked as delivered.");
    } catch (error) {
      setDeliveryStatus(error.message);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const pendingDeliveries = deliveries.filter((delivery) => delivery.status !== "delivered");
  const visibleDeliveries = (pendingDeliveries.length ? pendingDeliveries : deliveries).slice(0, 10);
  const outForDelivery = deliveries.filter((delivery) => delivery.status === "out_for_delivery").length;
  const deliveredToday = deliveries.filter((delivery) => delivery.status === "delivered" && delivery.delivery_date === today).length;

  return (
    <DashboardShell title="Delivery Dashboard" subtitle="Assigned deliveries, navigation links, confirmations, and customer contact.">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={Bike} label="Assigned Deliveries" value={deliveries.length} />
        <Metric icon={CalendarDays} label="Out for Delivery" value={outForDelivery} tone="orange" />
        <Metric icon={Check} label="Delivered Today" value={deliveredToday} />
      </div>
      {deliveryStatus && <p className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800 dark:bg-orange-500/10 dark:text-orange-200">{deliveryStatus}</p>}
      <div className="grid gap-4">
        {visibleDeliveries.map((delivery) => (
          <div key={delivery.id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 md:flex-row md:items-center dark:border-white/10 dark:bg-slate-900">
            <div>
              <p className="font-bold text-brand-ink dark:text-white">Delivery #{delivery.id} - Customer #{delivery.customer_id}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{delivery.delivery_date} - Route order #{delivery.route_order || "-"} - {humanizeStatus(delivery.status)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled><Phone size={18} />Call</Button>
              <Button disabled={delivery.status === "delivered"} onClick={() => markDelivered(delivery.id)}><Check size={18} />Delivered</Button>
            </div>
          </div>
        ))}
        {!deliveries.length && !deliveryStatus && <p className="rounded-lg bg-white p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">No deliveries assigned.</p>}
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ title, subtitle, children }) {
  return (
    <Section className="bg-slate-50 dark:bg-slate-950">
      <div className="mb-8">
        <Badge>Operations</Badge>
        <h1 className="mt-4 text-4xl font-extrabold text-brand-ink dark:text-white">{title}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>
      <div className="grid gap-6">{children}</div>
    </Section>
  );
}

function ChartPanel({ title, children }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"><h2 className="mb-4 text-lg font-bold text-brand-ink dark:text-white">{title}</h2>{children}</div>;
}

function ListPanel({ title, items }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-brand-ink dark:text-white">{title}</h2>
      <div className="mt-4 grid gap-3">{items.map((item) => <div key={item} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-700 dark:bg-white/5 dark:text-slate-200"><Check size={16} className="text-brand-green" />{item}</div>)}</div>
    </div>
  );
}

function PaymentPage({ user, setView, selectedPlanName, setSelectedPlanName }) {
  const [availablePlans, setAvailablePlans] = useState(plans);
  const [subscriptions, setSubscriptions] = useState([]);
  const initialPlan = plans.find((plan) => plan.name === selectedPlanName) || plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan?.id || 1);
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentData() {
      if (!user) {
        setPaymentStatus("Please login as a customer before making a payment.");
        return;
      }

      try {
        const [plansData, subscriptionsData] = await Promise.all([
          api("/plans"),
          api("/subscriptions/me")
        ]);
        if (!cancelled) {
          setAvailablePlans(plansData);
          setSubscriptions(subscriptionsData);
          const activeSubscriptions = subscriptionsData.filter((item) => item.status === "active");
          const selectedSubscription = [...activeSubscriptions].reverse().find((item) => item.plan?.name === selectedPlanName);
          const selectedPlan = plansData.find((plan) => plan.name === selectedPlanName);
          const currentSubscription = selectedSubscription || lastItem(activeSubscriptions) || lastItem(subscriptionsData);
          setSelectedPlanId(selectedSubscription?.plan_id || selectedPlan?.id || currentSubscription?.plan_id || plansData[0]?.id || 1);
          setPaymentStatus("");
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentStatus(error.message);
        }
      }
    }

    loadPaymentData();
    return () => {
      cancelled = true;
    };
  }, [user, selectedPlanName]);

  async function handlePayment(method) {
    if (!user) {
      setPaymentStatus("Please login first, then return to payment.");
      return;
    }

    setSelectedMethod(method);
    setIsPaying(true);
    setPaymentStatus("Processing payment...");

    try {
      const selectedPlan = availablePlans.find((plan) => plan.id === Number(selectedPlanId));
      if (!selectedPlan) {
        throw new Error("Please select a valid subscription plan.");
      }

      if (method === "Razorpay") {
        const payment = await handleRazorpayPayment(selectedPlan);
        setPaymentStatus(`Razorpay payment successful. Receipt #${payment.id} saved in Excel. Opening your customer dashboard...`);
        window.setTimeout(() => setView("customer-dashboard"), 900);
        return;
      }

      const subscription = await ensureSubscription(selectedPlan);
      const paymentPlan = subscription.plan || selectedPlan;
      const payment = await api("/payments", {
        method: "POST",
        body: JSON.stringify({
          subscription_id: subscription.id,
          amount: paymentPlan.final_price,
          method,
          transaction_reference: null
        })
      });

      setPaymentStatus(`Payment request submitted. Reference #${payment.id} is pending admin verification. Opening your customer dashboard...`);
      window.setTimeout(() => setView("customer-dashboard"), 900);
    } catch (error) {
      setPaymentStatus(error.message);
    } finally {
      setIsPaying(false);
    }
  }

  const selectedPlan = availablePlans.find((plan) => plan.id === Number(selectedPlanId)) || availablePlans[0];
  const selectedSubscription = [...subscriptions].reverse().find((item) => item.plan_id === selectedPlan?.id && item.status === "active");
  const payablePlan = selectedSubscription?.plan || selectedPlan;

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function ensureSubscription(selectedPlan) {
    let subscription = subscriptions.find((item) => item.plan_id === selectedPlan.id && item.status === "active");
    if (!subscription) {
      const today = new Date().toISOString().slice(0, 10);
      subscription = await api("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          selected_addons: selectedPlan.goal === "Weight Gain" ? ["Dry Fruits", "Protein Mix"] : ["Sprouts"],
          start_date: today
        })
      });
      setSubscriptions((current) => [...current, subscription]);
    }
    return subscription;
  }

  async function handleRazorpayPayment(selectedPlan) {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Razorpay checkout could not be loaded. Check your internet connection.");
    }

    const subscription = await ensureSubscription(selectedPlan);
    const order = await api("/payments/razorpay/order", {
      method: "POST",
      body: JSON.stringify({
        subscription_id: subscription.id,
        amount: (subscription.plan || selectedPlan).final_price
      })
    });

    if (order.demo_mode) {
      throw new Error("Razorpay keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.");
    }

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: {
          name: order.customer_name,
          email: order.customer_email,
          contact: order.customer_contact || ""
        },
        theme: { color: "#22C55E" },
        handler: async (response) => {
          try {
            const payment = await api("/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                subscription_id: subscription.id,
                amount: (subscription.plan || selectedPlan).final_price,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            resolve(payment);
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Razorpay payment was cancelled."))
        }
      });
      checkout.open();
    });
  }

  return (
    <Section>
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
        <Badge tone="orange">Payment</Badge>
        <h1 className="mt-4 text-3xl font-extrabold text-brand-ink dark:text-white">Complete subscription payment</h1>
        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
          <label className="text-sm font-bold text-brand-ink dark:text-white" htmlFor="payment-plan">Subscription plan</label>
          <select
            id="payment-plan"
            className="input"
            value={selectedPlanId}
            onChange={(event) => {
              const planId = Number(event.target.value);
              setSelectedPlanId(planId);
              setSelectedPlanName(availablePlans.find((plan) => plan.id === planId)?.name || "");
            }}
          >
            {availablePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name} - ₹{plan.final_price}</option>
            ))}
          </select>
          {payablePlan && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedPlan.goal} · 1 Month · Monday to Friday</span>
              <span className="text-2xl font-extrabold text-brand-green">₹{selectedPlan.final_price}</span>
            </div>
          )}
        </div>
        <div className="mt-6 grid gap-3">
          {["UPI", "PhonePe", "Google Pay", "Razorpay"].map((method) => (
            <Button key={method} variant={selectedMethod === method ? "primary" : "outline"} disabled={isPaying} onClick={() => handlePayment(method)}>
              <CreditCard size={18} />
              {isPaying && selectedMethod === method ? "Processing..." : method}
            </Button>
          ))}
        </div>
        {paymentStatus && (
          <p className={`mt-5 rounded-lg p-4 text-sm ${paymentStatus.toLowerCase().includes("successful") ? "bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-200" : "bg-orange-50 text-orange-800 dark:bg-orange-500/10 dark:text-orange-200"}`}>
            {paymentStatus}
          </p>
        )}
        {!user && <Button className="mt-4 w-full" onClick={() => setView("login")}><ShieldCheck size={18} />Login to Pay</Button>}
      </div>
    </Section>
  );
}

function App() {
  const [view, setView] = useState(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    return requestedView || "home";
  });
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(storedUser);
  const [selectedPlanName, setSelectedPlanName] = useState("Medium Bowl");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const routes = useMemo(() => ({
    home: <LandingPage setView={setView} setSelectedPlanName={setSelectedPlanName} />,
    about: <Benefits />,
    plans: <ProductCards setView={setView} setSelectedPlanName={setSelectedPlanName} />,
    contact: <Contact />,
    login: <Login setUser={setUser} setView={setView} />,
    register: <Register setUser={setUser} setView={setView} selectedPlanName={selectedPlanName} setSelectedPlanName={setSelectedPlanName} />,
    payment: <PaymentPage user={user} setView={setView} selectedPlanName={selectedPlanName} setSelectedPlanName={setSelectedPlanName} />,
    "admin-dashboard": <AdminDashboard />,
    "admin-products": <AdminDashboard initialPanel="products" />,
    "admin-product-detail": <AdminDashboard initialPanel="product-detail" />,
    "customer-dashboard": <CustomerDashboard user={user} setView={setView} />,
    "delivery_partner-dashboard": <DeliveryDashboard />
  }), [user, selectedPlanName]);

  function logout() {
    localStorage.removeItem("bite_token");
    localStorage.removeItem("bite_user");
    setUser(null);
    setView("home");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <Header view={view} setView={setView} dark={dark} setDark={setDark} user={user} logout={logout} />
      <main>{routes[view] || routes.home}</main>
      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">© 2026 Bite a Fruit. Eat Healthy, Live Better.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
