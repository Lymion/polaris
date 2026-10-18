import { averageMonthlySales, monthSeries, runwayMonths, totalOverheads, unitProfit } from "./finance";
import { formatMoney } from "./money";
import type { usePolaris } from "./store";

type State = ReturnType<typeof usePolaris.getState>;

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  body: string[];
  /** A sentence about the user's own numbers, or null when they haven't logged enough yet. */
  yours: (s: State) => string | null;
  quiz: { question: (currency: string) => string; options: (currency: string) => string[]; answer: number; why: string };
  /** What the guide is asked when the user wants it explained with their numbers. */
  ask: string;
}

export const LESSON_XP = 25;

const m = (n: number, c: string) => formatMoney(n, c, { compact: true });

export const LESSONS: Lesson[] = [
  {
    id: "cash-vs-profit",
    title: "Cashflow is not profit",
    summary: "Why a profitable business can still run out of money.",
    body: [
      "Profit is what's left after you take your costs away from your sales. Cashflow is the actual money moving in and out of your account, and when.",
      "The two drift apart all the time: you buy stock today and sell it next month, a café pays its invoice 60 days late, or you pay a year of insurance up front. On paper you're profitable, but the bank account is empty.",
      "That's why you track both: profit tells you whether the business works, cashflow tells you whether you can pay the bills this month.",
    ],
    yours: (s) => {
      const [now] = monthSeries(s.entries, new Date(), 1);
      if (!now.income && !now.expenses) return null;
      const c = s.profile.currency;
      return `This month ${m(now.income, c)} came in and ${m(now.expenses, c)} went out, so your cash moved by ${m(now.net, c)}.`;
    },
    quiz: {
      question: (c) => `You deliver ${m(5000, c)} of cakes to a café that pays in 60 days, and pay ${m(3000, c)} for ingredients today. What happens this month?`,
      options: (c) => ["You made a profit, but your cash went down", `Your cash went up by ${m(2000, c)}`, "Nothing changes until the café pays"],
      answer: 0,
      why: "The sale is real profit, but the money hasn't arrived yet, while the ingredients were paid for today.",
    },
    ask: "Explain cashflow vs profit using my own numbers from the Treasury. Where could my cash get squeezed?",
  },
  {
    id: "margin-markup",
    title: "Margin vs markup",
    summary: "Two ways to describe profit that people mix up all the time.",
    body: [
      "Markup compares your profit to what the item cost you. Margin compares your profit to the price the customer pays.",
      "If a cake costs 40 to make and you sell it for 60, you make 20. Markup is 20 ÷ 40 = 50%. Margin is 20 ÷ 60 = 33%.",
      "Margin is the one that tells you how much of every sale you actually keep, so it's the number to watch. A 50% markup is only a 33% margin.",
    ],
    yours: (s) => {
      const p = s.products[0];
      if (!p) return null;
      const c = s.profile.currency;
      const profit = p.price - p.unitCost;
      return `Your ${p.name}: sells for ${m(p.price, c)}, costs ${m(p.unitCost, c)}. Markup ${Math.round((profit / Math.max(p.unitCost, 0.01)) * 100)}%, margin ${Math.round((profit / p.price) * 100)}%.`;
    },
    quiz: {
      question: (c) => `Something costs you ${m(50, c)} and you sell it for ${m(100, c)}. What is your margin?`,
      options: () => ["50%", "100%", "200%"],
      answer: 0,
      why: "You keep 50 out of a 100 price, so the margin is 50%. (The markup is 100%.)",
    },
    ask: "Explain margin vs markup with my own products, and tell me whether my margins look healthy for my industry.",
  },
  {
    id: "platform-fees",
    title: "Platform fees eat your margin",
    summary: "A 30% commission isn't 30% of your profit. It's 30% of your price.",
    body: [
      "Delivery apps and marketplaces take their cut from the price the customer pays, not from your profit. That makes them far more expensive than they look.",
      "Sell a 50 item that costs you 25 on an app that takes 30%: the app keeps 15, so you're left with 10 instead of 25. Your profit drops by 60%.",
      "That's why many businesses charge more on apps than in the shop, or push regular customers to order directly.",
    ],
    yours: (s) => {
      const p = s.products[0];
      const paid = s.channels.filter((ch) => ch.feePercent > 0 || ch.feeFixed > 0);
      if (!p || !paid.length) return null;
      const c = s.profile.currency;
      const direct = s.channels.find((ch) => ch.feePercent === 0 && ch.feeFixed === 0);
      return `${p.name}: ${paid.map((ch) => `${m(unitProfit(p, ch).profit, c)} profit on ${ch.name}`).join(", ")}${direct ? `, vs ${m(unitProfit(p, direct).profit, c)} through ${direct.name}` : ""}.`;
    },
    quiz: {
      question: (c) => `Price ${m(50, c)}, cost to make ${m(25, c)}, and the app takes 30%. What do you keep per sale?`,
      options: (c) => [m(10, c), m(17.5, c), m(25, c)],
      answer: 0,
      why: "The app takes 30% of 50, which is 15. Then 50 − 25 − 15 = 10.",
    },
    ask: "Look at my products and sales platforms. Am I losing too much to platform fees? Should I price differently per platform?",
  },
  {
    id: "fixed-variable",
    title: "Fixed vs variable costs",
    summary: "Overheads stay the same. Variable costs grow with every sale.",
    body: [
      "Fixed costs, or overheads, are paid every month no matter what: rent, salaries, internet, insurance.",
      "Variable costs rise and fall with how much you sell: ingredients, packaging, delivery for each order.",
      "Overheads are dangerous in a slow month because they don't shrink. Keeping them lean gives you room to survive quiet periods.",
    ],
    yours: (s) => {
      if (!s.overheads.length) return null;
      const c = s.profile.currency;
      const total = totalOverheads(s.overheads);
      const sales = averageMonthlySales(s.entries);
      return `Your fixed costs are ${m(total, c)} a month${sales > 0 ? `, about ${Math.round((total / sales) * 100)}% of your average sales` : ""}.`;
    },
    quiz: {
      question: () => "Which of these is a variable cost for a bakery?",
      options: () => ["Flour for each cake", "Shop rent", "The monthly internet bill"],
      answer: 0,
      why: "You buy more flour as you bake more cakes. Rent and internet stay the same.",
    },
    ask: "Using my overheads and sales, explain my fixed vs variable costs and which fixed costs I should look at first.",
  },
  {
    id: "break-even",
    title: "Your break-even point",
    summary: "The amount you must sell before you make any profit at all.",
    body: [
      "Every sale leaves a bit of money after its own costs. That bit first has to pay off your fixed costs. Once they're covered, everything else is profit.",
      "Break-even units = fixed costs per month ÷ profit per unit. If rent and bills are 3,000 and each item leaves 15, you need to sell 200 a month just to break even.",
      "Knowing this number turns 'I hope it's a good month' into a daily target.",
    ],
    yours: (s) => {
      const p = s.products[0];
      const ch = s.channels[0];
      const fixed = totalOverheads(s.overheads);
      if (!p || !ch || !fixed) return null;
      const profit = unitProfit(p, ch).profit;
      if (profit <= 0) return `Your ${p.name} loses money on ${ch.name}, so it can't help you break even.`;
      return `You'd need to sell about ${Math.ceil(fixed / profit)} ${p.name} a month on ${ch.name} to cover ${m(fixed, s.profile.currency)} of fixed costs.`;
    },
    quiz: {
      question: (c) => `Fixed costs are ${m(3000, c)} a month and each item leaves ${m(15, c)} after its costs. How many must you sell to break even?`,
      options: () => ["200", "150", "450"],
      answer: 0,
      why: "3,000 ÷ 15 = 200 items. The 201st item is your first profit.",
    },
    ask: "Work out my break-even point with my own products and overheads, and turn it into a daily sales target.",
  },
  {
    id: "runway",
    title: "Runway and a cash buffer",
    summary: "How long you could keep going if sales stopped growing.",
    body: [
      "Runway is how many months your cash lasts if you keep losing money at the current rate: cash in the bank ÷ monthly loss.",
      "If you're losing money, runway is your deadline to fix things. If you're profitable, build a buffer instead: many advisors suggest keeping a few months of fixed costs in reserve.",
      "A buffer lets you handle a slow month, a broken oven or a late payment without panic.",
    ],
    yours: (s) => {
      if (s.cashOnHand === null) return null;
      const c = s.profile.currency;
      const r = runwayMonths(s.cashOnHand, s.entries);
      const fixed = totalOverheads(s.overheads);
      if (r !== null) return `With ${m(s.cashOnHand, c)} in the bank and your recent losses, your runway is about ${r.toFixed(1)} months.`;
      return fixed
        ? `You have ${m(s.cashOnHand, c)}, which covers about ${(s.cashOnHand / fixed).toFixed(1)} months of fixed costs.`
        : `You have ${m(s.cashOnHand, c)} in the bank.`;
    },
    quiz: {
      question: (c) => `You have ${m(6000, c)} in the bank and lose ${m(1500, c)} a month. What is your runway?`,
      options: () => ["4 months", "6 months", "9 months"],
      answer: 0,
      why: "6,000 ÷ 1,500 = 4 months before the money runs out.",
    },
    ask: "Using my cash, sales and costs, tell me my runway and how big a cash buffer I should aim for.",
  },
  {
    id: "pay-yourself",
    title: "Pay yourself and set aside tax",
    summary: "Keep business and personal money apart, on purpose.",
    body: [
      "Mixing personal and business money makes it impossible to see your real profit. Use a separate business account and move money out deliberately.",
      "Pay yourself a fixed amount on a set day instead of taking cash whenever you need it. It makes your personal life predictable and your business numbers honest.",
      "Every time money comes in, move a slice into a tax pot so the bill never surprises you. The right percentage depends on your country and structure, so check with an accountant.",
    ],
    yours: () => null,
    quiz: {
      question: () => "Why keep business and personal money in separate accounts?",
      options: () => ["To see your real profit and make tax easier", "It makes customers pay faster", "It lowers your rent"],
      answer: 0,
      why: "Separate accounts show exactly what the business earns and spends, which also makes your tax return far simpler.",
    },
    ask: "Help me set up a simple system to pay myself and set aside money for tax, based on my sales.",
  },
];
