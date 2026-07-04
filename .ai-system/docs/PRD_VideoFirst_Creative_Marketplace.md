Product Requirements
Document

Video-First Creative Services Marketplace
Nigeria

Prepared: June 2026

Classification: Confidential — Internal Draft

Technical Lead: Sotonye Adokiye Dagogo

Originating Author: Samson Afolabi

Version: 1.0 Draft

AI-ASSISTED DEVELOPMENT PIPELINE  |  NEXT.JS + TYPESCRIPT STACK

Table of Contents

1.

2.

3.

4.

5.

6.

7.

8.

9.

10.

11.

12.

13.

14.

Document Overview & Executive Summary

Problem Statement

Vision & Product Concept

Market Opportunity

Core User Journeys

Feature Requirements

Technical Architecture

Branching Points & Decision Alternatives

Payment & Escrow Architecture

Team Structure

Demo Scope & Success Criteria

Delivery Timeline

Open Questions & Decision Log

Risks & Mitigations

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 2

  1. Document Overview & Executive Summary

This PRD translates the co-founder discussion draft authored by Samson Afolabi into a structured,

engineer-ready requirements document. It is intended for use by the Technical Lead (Sotonye Adokiye Dagogo)

to guide demo scoping, architectural decisions, and the 4-week build sprint ahead of an investor conversation.

Where the source document presents open questions or branching decision points, this PRD surfaces explicit

alternatives with trade-off analysis so decisions can be made deliberately rather than deferred.

What This Document Covers

(cid:127) Formalised product vision, problem definition, and target user personas

(cid:127) Core feature requirements broken into demo-scope (P0) and post-demo (P1/P2) tiers

(cid:127) Technical architecture recommendation aligned to the technical lead's established stack and AI-assisted

delivery pipeline

(cid:127) Decision alternatives at every major branching point identified in the source document

(cid:127) A 4-week delivery timeline calibrated for AI-assisted development throughput

(cid:127) Risk register and open question log to track unresolved decisions

Document Status

This is a v1.0 draft produced prior to the co-founder alignment call. Sections marked 'To Be Confirmed' require

decisions  from  that  call  before  final  scoping.  All  timeline  estimates  assume  the  technical  lead's  AI-assisted

development pipeline is active and reflect accelerated throughput accordingly.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 3

  2. Problem Statement

Nigeria's creative industry is a $15B economy operating largely through informal, trust-deficit channels. The

absence of purpose-built infrastructure creates compounding problems for both buyers and sellers of creative

services — problems this product is designed to solve.

Provider Pain Points

(cid:127) Discovery ceiling: Providers are limited to their existing follower base. Discovery is algorithmic and

unpredictable, not intent-based.

(cid:127) Payment risk: DM-based bookings offer no payment protection. Providers routinely experience

non-payment or scope creep with no recourse.

(cid:127) Portfolio inadequacy: Static photos and text bios fail to communicate dynamic skills such as shot

composition, editing style, or on-air presence.

(cid:127) Professionalisation barrier: No infrastructure to manage bookings, contracts, availability, or client history in

one place.

Client / Brand Pain Points

(cid:127) Discovery friction: Finding vetted creative talent requires manual Instagram/LinkedIn search, referral

chains, or expensive agency intermediaries.

(cid:127) Quality uncertainty: Without video samples and verified work history, clients make costly hiring mistakes.

(cid:127) Payment complexity: No escrow mechanism; clients carry full payment risk on large creative engagements.

(cid:127) No accountability layer: Disputes with no-shows or underdelivered work have no platform-level resolution

path.

Structural Market Gap

No incumbent platform specifically addresses video-first discovery of creative services in Nigeria or West Africa

with  native  booking  and  escrow  infrastructure.  Global  platforms  (Fiverr,  Upwork,  Contra)  lack  local  payment

rails,  Nigerian  creator  context,  and  the  video-first  discovery  model.  Local  alternatives  are  either  too  broad

(general labour marketplaces) or too shallow (social media profiles).

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 4

  3. Vision & Product Concept

A marketplace where Nigerian creative professionals showcase their work through video — not just photos or

text — and clients can discover, book, and pay securely on the platform. The platform is built on the thesis that

for creative services, skill is best demonstrated, not described.

Product Positioning

Dimension

This Product

Current Alternative

Discovery method

Video-first, intent-driven search

Instagram DMs, referrals

Booking

In-platform structured booking

WhatsApp informal agreement

Payment

Escrow-protected

Paystack/Flutterwave

via

Bank transfer, no protection

Portfolio

Video samples + verified work history

Static bio + photos

Dispute resolution

Platform-mediated

None

Target market

Nigeria creative industry (Phase 1)

Global generalist platforms

Target User Personas

Persona A — The Creative Professional (Provider)

(cid:127) Cinematographer, videographer, content creator, podcast host/producer, or photographer

(cid:127) Currently books through Instagram DMs or WhatsApp; frustrated by payment risk and discovery ceiling

(cid:127) Has strong video samples but no dedicated professional profile or booking infrastructure

(cid:127) Motivated to professionalise and access higher-value brand clients

Persona B — The Brand / Business Client (Buyer)

(cid:127) SMB, agency, or brand marketing team seeking to hire creative talent for campaigns, events, or content

(cid:127) Currently relies on agency referrals or manual social media search; frustrated by quality unpredictability and

payment risk

(cid:127) Needs verifiable portfolio quality, professional booking, and payment protection

(cid:127) Budget-conscious; requires transparent pricing before commitment

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 5

  4. Market Opportunity

Nigeria's creative economy is large, growing, and structurally underserved by existing platforms. The data below

represents directional sizing; deeper validation is recommended prior to Series A positioning.

Metric

Value

Nigeria creative industry (2025)

Africa creator economy (2023)

Africa creator economy projection (2030)

Nigeria design industry (2022)

Nigeria fashion industry

Nigerian YouTube annual views (2024)

~$15 Billion

~$3 Billion

~$18 Billion

$1.8 Billion

$4.7 Billion

20+ Billion

Nigerian YouTube channels (100k+ subs)

1,500+ Channels

Key Market Insights

(cid:127) Scale confirms this is not a niche bet. A $15B industry with active brand spend represents a large

addressable market for a focused marketplace.

(cid:127) Demand is already real. Brands, agencies, and individuals are actively spending on creative services — the

distribution channel, not the demand, is broken.

(cid:127) Video consumption validates the thesis. 20+ billion YouTube views annually from Nigeria signals deep

familiarity with video as a medium, supporting video-first discovery behaviour.

(cid:127) Platform algorithm shifts support the model. Platforms increasingly reward engagement metrics over
follower count, pushing creators toward demonstrated quality — exactly what this marketplace serves.

(cid:127) The informal gap is the opportunity. The majority of this economic activity runs through DM-based,

unstructured booking with no payment protection or professional infrastructure.

Note: Competitive landscape mapping is flagged as a joint exercise for the co-founder call. This PRD recommends
completing that analysis before finalising the investor pitch narrative. Key questions: Which local platforms have
attempted video-first creative marketplaces? What happened to them? What does the technical lead's own prior
marketplace experience reveal about two-sided market acquisition in Nigeria?

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 6

  5. Core User Journeys

Two primary journeys define the platform's core loop: the Provider Onboarding & Profile journey, and the Client

Discovery & Booking journey. A third, the Completion & Payment Release journey, contains the most critical

unresolved decision in the product (see Section 8).

Journey 1 — Provider Onboarding & Profile

Step

Action

System Response

1

2

3

4

5

Provider  signs  up  (email/phone  via  CIS  auth

layer)

Account created; onboarding wizard triggered

Selects service category (e.g., cinematographer)

Uploads video portfolio samples (min 1, rec 3+)

Category-specific

profile

fields

rendered

(admin-configurable)

Video  processed,  thumbnail  generated,  stored

(Cloudinary or Mux)

Sets service description, pricing, and availability

Profile saved; availability calendar initialised

Profile goes live / pending review (TBC — see Alt

8.1)

Profile visible in browse/search index

Journey 2 — Client Discovery & Booking

Step

Action

System Response

1

2

3

4

5

6

Client signs up or browses as guest (TBC — see

Alt 8.2)

Session created; browse/search UI rendered

Searches/filters  by  category,  location,  budget,

Filtered provider grid returned; video autoplay on

style

hover

Views provider profile; watches video samples

View event logged; video engagement tracked

Initiates  booking  request  with  date,  scope,

budget

Booking request created; provider notified

Provider accepts or counter-proposes

Client notified; booking confirmed on acceptance

Client pays (funds held in escrow)

Payment  captured  via  Paystack/Flutterwave;

escrow state = HELD

Journey 3 — Service Completion & Payment Release

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 7

This  journey  contains  the  single  most  consequential  product  decision:  what  triggers  payment  release?  See

Section 8 (Branching Points) for full alternative analysis. At a high level, the three candidate mechanisms are:

(A)  client  explicit  confirmation,  (B)  auto-release  after  N  days  post-service  date,  or  (C)  a  hybrid  of  both.  The

chosen mechanism directly shapes the dispute resolution model, provider trust dynamics, and platform liability

exposure.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 8

  6. Feature Requirements

Features are tiered P0 (demo-critical), P1 (post-demo, pre-launch), and P2 (growth-phase). The 4-week sprint

targets all P0 items. P1 and P2 are documented for architectural foresight but are explicitly out of scope for the

investor demo.

P0 — Demo Scope (Weeks 1–4)

Feature

Description

Notes

Provider profile

Video  upload,  bio,  category,  pricing,  availability

Cloudinary  or  Mux

for  video;

display

admin-configurable category fields

Browse & search

Category filter, location filter, budget filter; video

Metadata-driven  filter  config;  no

preview on hover

full-text search required for demo

Booking flow

Mock payment

Date/scope selection, booking request, provider

State  machine:  REQUESTED  >

accept/decline

ACCEPTED > IN_PROGRESS

Payment  UI  with  Paystack  integration  stubbed

Real  Paystack  sandbox  preferred

or sandboxed

over full mock for demo credibility

Escrow state display

Visual indicator of funds held / released status

Auth (CIS integration)

Email/phone

sign-up,

login,

session

management

Admin

config

category

Ability  to  add/edit  service  categories  without

code deploy

State only; no real fund movement

required for demo

Leverage existing CIS backend at

github.com/Sotonye0808/cis_back

end

Aligns

with

established

metadata-driven

architecture

philosophy

P1 — Pre-Launch (Post-Demo)

Feature

Description

Real  escrow  &  payment

Full  Paystack/Flutterwave  escrow  with  release  trigger  (per  decision  in

release

Section 8)

Dispute resolution flow

Client dispute initiation, platform review, admin resolution dashboard

Provider verification

Identity/portfolio verification layer before profile goes live

Review & rating system

Post-service ratings for both provider and client; displayed on profiles

Messaging / chat

In-platform messaging between client and provider post-booking

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 9

Feature

Description

Notifications

Email + push: booking requests, confirmations, payment events, reminders

Provider dashboard

Earnings summary, booking history, availability calendar management

Client dashboard

Active bookings, booking history, payment history

P2 — Growth Phase

Feature

Description

Video analytics for providers

View counts, engagement rates, conversion (views to booking requests)

Promoted listings

Paid featured placements for providers within category search

Package / bundle listings

Providers can offer tiered service packages at different price points

API / embed

White-label booking widget for agencies to embed on their own sites

Mobile apps (iOS / Android)

Native mobile experience for both provider and client journeys

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 10

  7. Technical Architecture

The recommended architecture is grounded in the technical lead's established development philosophy:

metadata-driven and admin-configurable, OOP class-based services with interface-first TypeScript, role-aware

(not role-specific) components, and universal component wrappers preventing direct raw library imports in

feature code. The stack aligns with the technical lead's active project portfolio.

Recommended Stack

Layer

Technology

Rationale

Frontend

Next.js  14  (App  Router)  +

Consistent  with  active  projects;  SSR  for  SEO  on

TypeScript

provider profiles; RSC for performance

Styling

Tailwind CSS + design tokens

Rapid development; admin-configurable theme via CSS

variables

Animation

Framer Motion

Consistent  with  established  stack;  video  preview  hover

transitions

Video hosting

Backend

Database

Cloudinary

(demo)

/  Mux

Cloudinary sufficient for demo; Mux for production-grade

(production)

adaptive streaming

Next.js  API  Routes  +  Node.js

Monorepo  simplicity  for  demo;  extract  to  microservices

services

post-funding

PostgreSQL

(Supabase  or

Relational  model  suits  marketplace  entities;  Supabase

Railway)

adds realtime for bookings

Auth

CIS Backend (existing)

Reuse canonical identity service; avoid auth rebuild

Payment

CMS / Config

Deployment

Paystack

(primary)

/

Nigerian-native rails; both support escrow-adjacent hold

Flutterwave (fallback)

patterns

Sanity  CMS  or  DB-driven

Admin-configurable category metadata; no code deploy

admin config

for category changes

Vercel

(frontend)

+

Consistent with existing project deployments; fast demo

Railway/Render (API)

URL provisioning

AI Dev Pipeline

.ai-system  directory  +  Open

Design/Code workflow

Existing structured pipeline; accelerates demo delivery

Core Data Model (Draft)

(cid:127) User — id, role (PROVIDER | CLIENT | ADMIN), profile_id (FK), created via CIS

(cid:127) Provider Profile — id, user_id, category_id, bio, pricing_config (JSONB), availability_config (JSONB),

verified, active

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 11

(cid:127) Video Sample — id, provider_id, url, thumbnail_url, duration, order_index

(cid:127) Category — id, slug, label, field_schema (JSONB) — admin-configurable via CMS or DB

(cid:127) Booking — id, client_id, provider_id, service_date, scope_notes, status (enum), price, escrow_status

(cid:127) Payment — id, booking_id, amount, currency, paystack_ref, escrow_state (HELD | RELEASED |

REFUNDED)

(cid:127) Review — id, booking_id, reviewer_id, reviewee_id, rating (1–5), comment

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 12

  8. Branching Points & Decision Alternatives

The source document surfaces five critical decision points that were intentionally left open for the co-founder

alignment call. This section presents each as a structured decision with alternative approaches, trade-offs, and

a recommended path. Decisions should be formally recorded in the Decision Log (Section 13).

8.1 Launch Category Focus — How Many & Which Ones?

The  source  document  lists  four  candidate  categories  (cinematographers/videographers,  content  creators,

podcast hosts/producers, photographers) and flags the need to narrow to 1–2 for the demo.

Option

Scope

Pros

Cons

Recommended?

Cinematographe

A  —  Single

rs

/

category

Videographers

only

B  —  Two

categories

Cinematographe

rs  +  Content

Creators

Maximum  focus;  one

user

type

to

Smaller  addressable

understand

deeply;

demo  pool;  may  feel

faster  demo;  sharper

narrow to investors

YES  (if  investor  pitch

is 4 weeks away)

investor story

Broader

appeal;

demonstrates

multi-category

More  onboarding  UI

variants;  slightly  more

ACCEPTABLE if time

architecture;  Samson

complex

search/filter

permits

has  direct  access  to

logic

both via Kali Zoi

All

listed

C — All four

categories

at

launch

Maximum

market

coverage for pitch

Insufficient

time

to

build  and  populate  4

category

variants

credibly  in  4  weeks;

demo quality suffers

NOT

recommended

for demo sprint

Note: Decision to confirm on co-founder call. Recommendation: Option A for the demo; architect category system as
admin-configurable from Day 1 so expansion requires zero code changes.

8.2 Payment Release Trigger — What Determines 'Service Completed'?

This is the single most consequential product decision. The payment release mechanism determines provider

trust, client protection, dispute likelihood, and platform liability.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 13

Option

Mechanism

Provider
Experience

Client
Experience

Dispute
Risk

Recommended?

A  —

Client

Payment

releases

explicit

only  when  client  taps

confirm

'Mark Complete'

Higher

risk  —

client  can  delay

indefinitely

or

ghost

Maximum

protection;  client

controls release

ation

B — Au

to-relea

se  after

N days

C  —

Hybrid

(B  +  A

safety

valve)

Payment

auto-releases  N  days

Predictable

post-service

date

release  timeline;

(e.g.  3–7  days)  if  no

low friction

dispute raised

Auto-release  after  N

days  unless  client

Best  of  both  —

raises

a

formal

predictable  with

dispute

before

early

release

deadline;  client  can

option

also confirm early

Partial

YES

(recommended)

High — non-

confirmation

is a lever for

abuse

Moderate  —

clear

deadline

reduces

ambiguity

Low

—

Passive

protection;  must

actively  dispute

to block release

Protected

by

structured

deadline + active

dispute

release option

window  with

clear expiry

YES

(strongly

recommended)

Note: Recommendation: Option C. Implement as a state machine: HELD > (dispute raised ﬁ DISPUTED) or (N days
elapsed / client confirms ﬁ RELEASED). This is the industry standard (see Fiverr, Upwork). For the demo, simulate
this state visually without real fund movement.

8.3 Provider-to-Platform Proposition — Why Move From Free DMs?

The  source  document  explicitly  flags  this  as  a  critical  open  question:  'Why  would  providers  and  clients  move

from free DM booking to a platform that takes a cut?' This is both a product design question and a go-to-market

question.

Approach

Core Value Proposition

Platform Cut Justification

Risk

A

—

No  platform  fee  for  first  6–12

Paid

features

(promoted

Revenue  delay;  harder  to

Zero-fee

months;

grow

supply-side

listings,  analytics)  monetise

raise

on;

sets

fee

launch

aggressively

later

expectation low

B  —  Low

Fee  funds  escrow  protection

Safety

+

professionalism;

Requires

clear,

tangible

flat

fee

and  dispute

resolution  —

brands  will  pay  premium  for

fee-for-value  communication

(5–8%)

services not available in DMs

verified, insured bookings

at onboarding

C

—

Tiered

model

Free  tier  (limited  videos,  no

escrow); paid subscription (full

escrow,

analytics,

priority

search)

Freemium  on-ramp;  pays  for

More  complex

to  build;

itself  once  providers  land  1

demo  scope  should  mock

paid booking

the model, not implement it

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 14

Note: Recommendation: Option B for launch. The escrow and professional booking infrastructure is the tangible,
defensible value over DMs. A 5–8% fee on protected transactions is a reasonable ask when the alternative is 100%
payment risk. This also creates a clear, investor-legible revenue model.

8.4 Demo Build Approach — Prototype vs Functional Build

The source document proposes 'a clickable prototype or lightweight functional build' for the investor demo. This

is a strategic decision with direct implications for the technical lead's 4-week sprint.

Option

What Gets Built

Demo Impression

Post-Demo Leverage

Recommended?

A

—

Figma

/

High-fidelity  screens  with

Polished

visual

Zero  code  to  carry

clickable

hotspot  navigation;  no  real

story;

forward;  must  rebuild

NO

prototype

code

investor-friendly

from scratch

only

B  —  Light

weight

Real  Next.js  app:  working

Highly credible; live

functional

auth,  real  video  uploads,

URL  investor  can

build  (rec

booking  flow  with  Paystack

use  on  phone  after

ommende

sandbox, mock escrow state

meeting

All

code

carries

forward  directly

to

production; no rebuild

YES

(strongly

recommended)

d)

C  —  Full

Everything  in  B  plus  real

functional

escrow,

notifications,

build

dispute flow

Most

impressive;

Maximum  carryover

NOT

most

risky  —

but  4-week  delivery

recommended —

quality  suffers

if

risk  is  high  without

scope

to  B,

over-scoped

focused scope

architect for C

Note: Recommendation: Option B. AI-assisted development pipeline meaningfully compresses delivery time for this
scope. The goal is a live Vercel URL the investor can open on their phone after the meeting — that is more compelling
than any Figma prototype.

8.5 Guest Browse vs. Required Registration

Whether clients must register before browsing provider profiles is a friction vs. data trade-off that meaningfully

affects early adoption and demo impression.

Option

Browse

Book

Implication

A  —  Gate

everything

Registration required

Registration required

collection;  higher  drop-off  before  value

is

Reduces  casual  discovery;  stronger  data

demonstrated

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 15

Option

Browse

Book

Implication

B

—

Open

browse,

gate

booking

No

registration

for

browse + video view

Registration required

demo  flows  more  naturally;  industry  standard

Lower  barrier  to  value  demonstration;  investor

for marketplaces

C  —  Full

No

registration

for

open

browse or booking

No registration at all

Highest  conversion  but  no  user

identity;

unusable for escrow/payment model

Note: Recommendation: Option B. Open browse is critical for demo flow and consistent with marketplace best
practice. CIS auth layer makes registration frictionless when the gate is hit.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 16

  9. Payment & Escrow Architecture

The escrow mechanism is the platform's core trust infrastructure and the primary differentiator from informal DM

booking. The architecture must be simple enough to demo in 4 weeks but robust enough to carry forward to

production without a rewrite.

Escrow State Machine

State

Description

Transition Trigger

PENDING

Booking accepted; awaiting client payment

Client confirms booking + initiates payment

HELD

Payment captured; funds held in escrow

Paystack payment success webhook

IN_PROGRES

S

DISPUTED

Service delivery window active

Service start date reached

Client  raises  formal  dispute  before  release

deadline

Client dispute action within window

RELEASED

Funds released to provider

expires  OR  admin  resolves  dispute

in

Client  confirms  OR  auto-release

timer

REFUNDED

Funds returned to client

provider's favour

Admin resolves dispute in client's favour OR

provider cancels

CANCELLED

Booking cancelled before payment or during

window

Either party cancels per cancellation policy

Payment Provider Recommendation

Primary: Paystack. Nigerian-native, strong developer experience, sandbox environment for demo, subaccount

feature for marketplace split payments (platform fee deduction before provider payout). Fallback: Flutterwave.

Similar capability; provides redundancy and broader West African coverage for post-Nigeria expansion.

Demo  approach:  Use  Paystack  sandbox.  Implement  the  full  payment  flow  in  test  mode  so  the  investor  can

complete  a  real  payment  interaction  —  card  entry,  confirmation,  escrow  state  change  —  using  Paystack  test

card numbers. This is more credible than a fully mocked UI.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 17

  10. Team Structure

The following draft structure is based on the source document's proposed role division. All equity, time

commitment, and compensation figures are explicitly TBD pending the co-founder alignment call. This table

documents the starting position for that conversation.

Area

Samson Afolabi (Co-Founder)

Technical Lead / Co-Founder

Primary Role

content/marketing,

pitch,

business

technical

architecture,

AI-assisted

Strategy,

market

research,

Product

ownership,

engineering,

development

delivery pipeline

Time Commitment

TBD — to be confirmed post-call

TBD  —  to  be  scoped  against  active

project load

Proposed Equity

TBD — subject to co-founder negotiation

TBD — subject to co-founder negotiation

Demo Responsibility

Source  3–5  creator  video  samples  via

Build  provider  profile  +  browse/search  +

Kali Zoi network

booking flow

Governance Questions to Resolve

(cid:127) What is the status of the technical lead's own prior marketplace project? (Active, paused, or fully wound

down?)

(cid:127) What time commitment (hours/week) is realistic for each co-founder given existing obligations?

(cid:127) What equity split feels fair to both parties prior to any external investment?

(cid:127) Will a vesting schedule (e.g., 4-year with 1-year cliff) be established from the outset?

(cid:127) What are the terms if either co-founder needs to step back before a funding event?

(cid:127) Does the technical lead want a hands-on technical co-founder role, or a more advisory/part-time

involvement?

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 18

  11. Demo Scope & Success Criteria

The demo must answer one question in the investor's mind: 'Could this actually work?' That means

demonstrating the full core loop — discovery, booking, and payment trust — with real content, in a live

environment, on a mobile browser.

Demo Must-Haves (P0 Non-Negotiables)

(cid:127) Live Vercel URL accessible on mobile (not a local build)

(cid:127) 3–5 real provider profiles with actual video portfolio content (sourced by Samson via Kali Zoi)

(cid:127) Working video playback on profile pages (not YouTube embeds — hosted video for credibility)

(cid:127) Functional search/filter: at minimum category and location filter returning real results

(cid:127) Complete booking flow: browse > profile > book > Paystack sandbox payment > escrow state change

(cid:127) Visual escrow state indicator: investor should see funds move from 'Held' toward 'Released'

(cid:127) Auth: real login/registration via CIS integration

Demo Success Criteria

Criterion

Pass Condition

End-to-end flow completes without error

Investor  can  complete  full  booking  journey  on  mobile  without

manual guidance

Video playback

Payment interaction

Content credibility

All  video  samples  play  within  3  seconds  on  standard  4G

connection

Paystack sandbox payment succeeds; escrow state updates in

real-time

At  least  3  provider  profiles  have  genuine,  high-quality  video

samples

Performance

Page load under 3s on mobile; no layout shift on profile pages

Investor walkthrough

Either  co-founder  can  demo  the  full  flow  in  under  5  minutes

without notes

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 19

  12. Delivery Timeline

The following timeline is calibrated for a technical lead operating with an AI-assisted development pipeline and

structured .ai-system workflow. Estimates reflect this accelerated throughput — tasks that would take 2–3 days

with traditional development are estimated at 1–1.5 days. The timeline is aggressive but achievable given

focused scope.

Week

Focus Areas

Technical Deliverables

Finalise 1–2 launch categories. Agree roles,

Week 1

equity,  time  commitment.  Map  competitive

landscape.

Stack decision (Next.js 14 + TS). DB schema draft.

Repo init + CI/CD. Design system tokens.

Week 2

Week 3

Week 4

Begin  demo  build.  Samson  sources  sample

creator video content.

Continue build. Draft pitch narrative & deck.

Internal demo test.

Provider  profile  +  video  upload  (Cloudinary/Mux

POC).  Browse/search  UI.  Component

library

scaffolding.

Booking  flow  (mock  payment).  Admin-configurable

category  config.  Basic  escrow  state  machine

(mock). Responsive QA.

Finalise demo + pitch deck. Rehearsal. Final

Demo  polish.  Error  states.  Performance  pass.

review.

Deploy to Vercel preview URL for investor demo.

AI-Assisted Development Pipeline Notes

(cid:127) DESIGN.md ﬁ PROMPTS.md workflow: Category UI, provider profile layout, and booking flow can be

specced in DESIGN.md and implemented via structured AI prompts — reducing component scaffolding time
by ~60%.

(cid:127) Admin-configurable architecture: Implementing category schema as JSONB from Day 1 means new

categories (Podcast Hosts, Photographers) can be added post-demo in under an hour, no code changes.

(cid:127) CIS reuse: Auth is not a buildable item — CIS integration is a configuration task estimated at half a day,

freeing a full sprint day for feature work.

(cid:127) Framer Motion transitions: Video hover previews and booking flow transitions are high-impression,

low-effort items well-suited to AI-assisted component generation.

Note: Timeline assumes co-founder alignment decisions (Section 13) are resolved by end of Week 1. Any deferred
decisions (particularly launch category scope and payment release mechanism) directly impact Week 2 build start.
Decisions deferred beyond Week 1 compress the build window.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 20

  13. Open Questions & Decision Log

All unresolved decisions from the source document are captured here with priority and due date. This log should

be updated immediately after the co-founder alignment call. Unresolved P0 decisions block sprint start.

Question

Priority

Blocks

Status

#

D1

D2

D4

D5

D7

D8

D9

D1

0

Which  1–2  service  categories  for

demo?

Payment

release

trigger

mechanism? (see Alt 8.2)

P0

P0

D3

Platform fee model? (see Alt 8.3)

P1

Week

2

build,

category

schema, content sourcing

Escrow  state  machine,  Week

2+ build

Pricing

UI,

Paystack

subaccount config

Provider

profile

review/approval

before going live?

P1

Admin  workflow,

provider

onboarding UX

Guest  browse  or  registration-gate?

(see Alt 8.5)

P0

Auth flow, Week 2 browse UI

OPEN

D6

Equity split and vesting structure?

P0  (bus

Co-founder

agreement,

iness)

investor disclosure

Time  commitment  per  co-founder

P0  (bus

Sprint

planning,

scope

(hours/week)?

iness)

negotiation

Status  of

technical

lead's  prior

P1  (bus

Conflict  of  interest  disclosure

marketplace project?

iness)

to investor

Competitive

landscape  —  which

local platforms attempted this?

P1

Investor  pitch  differentiation

narrative

Working product name?

P2

Domain, branding, pitch deck

OPEN

OPEN

OPEN

OPEN

OPEN

OPEN

OPEN

OPEN

OPEN

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 21

  14. Risks & Mitigations

Key risks are identified across product, technical, and business dimensions. Each risk is rated by likelihood and

impact, with a recommended mitigation. This register should be reviewed weekly during the sprint.

Risk

Category

Likeliho
od

Impact

Mitigation

Demo  over-scoped;

Lock scope at Week 1 call. Apply Option B demo

unfinished

product

Delivery

Medium Critical

approach (Section 8.4). Cut any P1 feature creep

shown to investor

Video

ruthlessly.

Use  Cloudinary  with  CDN;  pre-warm  all  demo

upload/playback  fails

Technical

Low

Critical

video  URLs.  Have  offline  backup

(screen

during investor demo

Paystack

sandbox

recording) as fallback.

Test  end-to-end  payment  flow  daily  in  Week  4.

payment  fails  during

Technical

Low

High

Prepare

test  card  cheat  sheet.  Have  mock

demo

payment fallback UI.

Co-founder alignment

Set  hard  deadline:  decisions  resolved  within  48

call  doesn't  resolve

Business

Medium High

hours  of  call  or

technical

lead  defaults

to

D1–D7

Provider

content

sourcing

delayed

(Samson's

responsibility)

recommended options.

Business

Medium High

sourcing  in  Week  1  regardless  of  final  category

Minimum  bar  is  3  profiles  with  real  video.  Begin

decision.

Two-sided  cold  start:

High  (p

Pre-seed  supply  side  manually  via  Kali  Zoi

no

providers,

no

Market

ost-de

High

network.  Invite-only  beta.  This  is  a  post-funding

clients

mo)

problem, not a demo problem.

Payment  regulation  /

CBN  compliance  for

escrow model

Legal/Co

mpliance

Medium High

Consult

fintech

lawyer  pre-launch.  Paystack's

existing  CBN  licensing  may  cover  the  escrow

model under their terms. Verify before real money

flows.

Competitor  launches

similar product during

Market

Low

sprint

Mediu

m

Speed

to  demo

is

the  defence.  First-mover

advantage in this niche is real given the structural

gap identified.

End of Document — PRD v1.0 Draft
Prepared by Sotonye Adokiye Dagogo (Technical Lead) · June 2026 · To be updated with co-founder call decisions.

Video-First Creative Services Marketplace — PRD v1.0 Draft  |  Confidential

Page 22

