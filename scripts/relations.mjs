// The link vocabulary: every `rel` label, read from the file that holds it, and its reading from the other end.
//   [ based at, wright-patterson-afb ] in project-sign.md  →  Project Sign "based at" Wright-Patterson,
//                                                              Wright-Patterson "home of" Project Sign
// Labels are 1–3 words (they are drawn on the graph); a link can carry a one-line note as a third item, shown on hover
// and under the link in the dossier:  - [ based at, wright-patterson-afb, "Run by Air Materiel Command at Wright Field" ]
// `npm run check` warns about labels missing here. Symmetric labels map to themselves.
// Shared by build.mjs (shipped to the app as KB.inverse) and pages.mjs.
const PAIRS = [
  // generic: avoid; prefer a specific label below, or add one
  ['related to', 'related to'],
  // people and people
  ['worked with', 'worked with'], ['works with', 'works with'], ['colleague of', 'colleague of'], ['co-author of', 'co-author of'],
  ['co-authored with', 'co-authored with'], ['co-founded with', 'co-founded with'], ['family of', 'family of'], ['married to', 'married to'],
  ['interviewed', 'interviewed by'], ['briefed', 'briefed by'], ['supervised', 'supervised by'], ['advised', 'advised by'],
  ['mentored', 'mentored by'], ['recruited', 'recruited by'], ['hired', 'hired by'], ['employed', 'employed by'],
  ['corroborates', 'corroborated by'], ['disputes', 'disputed by'], ['refutes', 'refuted by'], ['vouches for', 'vouched for by'],
  ['informed', 'informed by'], ['source for', 'sourced from'], ['helped by', 'helped'], ['succeeded', 'succeeded by'],
  ['investigated with', 'investigated with'], ['flew with', 'flew with'], ['served with', 'served with'], ['debated', 'debated'],
  ['represented', 'represented by'], ['questioned', 'questioned by'], ['accused', 'accused by'], ['fed stories to', 'fed stories by'],
  ['disinformed', 'disinformed by'], ['sued', 'sued by'], ['cited', 'cited by'], ['endorsed', 'endorsed by'], ['succeeded by', 'succeeded'],
  ['preceded by', 'preceded'], ['followed by', 'follows'], ['follows', 'followed by'],
  // people and organisations, programs, places
  ['worked at', 'staff'], ['worked on', 'staff'], ['served at', 'staff'], ['stationed at', 'station of'], ['studied at', 'alumni'],
  ['member', 'members'], ['member of', 'members'], ['led', 'led by'], ['led by', 'led'], ['ran', 'run by'], ['run by', 'runs'],
  ['directed', 'directed by'], ['directed by', 'directed'], ['chaired', 'chaired by'], ['chaired by', 'chaired'],
  ['founded', 'founded by'], ['founded by', 'founded'], ['co-founded', 'co-founded by'], ['co-founded by', 'co-founded'],
  ['funded', 'funded by'], ['funded by', 'funded'], ['sponsored', 'sponsored by'], ['sponsored by', 'sponsored'], ['co-sponsored', 'co-sponsored by'],
  ['contractor', 'contractor for'], ['contractor for', 'contractor'], ['owned', 'owned by'], ['owned by', 'owned'],
  ['oversaw', 'overseen by'], ['overseen by', 'oversaw'], ['created', 'created by'], ['created by', 'created'], ['initiated', 'initiated by'], ['initiated by', 'initiated'],
  ['ordered', 'ordered by'], ['proposed', 'proposed by'], ['proposed to', 'received proposal from'], ['pushed for', 'pushed for by'],
  ['legislated', 'legislated by'], ['wrote law on', 'law by'], ['sought access to', 'access sought by'], ['denied access to', 'denied access'],
  ['briefed on', 'briefed'], ['knew of', 'known to'], ['exposed', 'exposed by'], ['revealed', 'revealed by'], ['promoted', 'promoted by'], ['promoted by', 'promoted'],
  ['partner of', 'partner of'], ['collaborated with', 'collaborated with'], ['advises', 'advised by'], ['visited', 'visited by'], ['lived near', 'home area of'],
  ['employed by', 'employed'], ['held', 'held by'], ['held by', 'held'], ['hosted', 'hosted by'], ['hosted by', 'hosted'], ['hosts', 'hosted by'],
  ['organized', 'organized by'], ['organized by', 'organized'], ['moderated', 'moderated by'], ['moderated by', 'moderated'],
  ['handled', 'handled by'], ['handled by', 'handled'], ['received complaint from', 'complained to'], ['filed with', 'received filing from'], ['filed', 'filed by'], ['filed by', 'filed'],
  // incidents and investigations
  ['witness', 'witnesses'], ['witness to', 'witnesses'], ['investigated', 'investigated by'], ['investigated by', 'investigated'],
  ['analysed', 'analysed by'], ['analysed by', 'analysed'], ['analysed for', 'analysis by'], ['studied', 'studied by'], ['studied by', 'studied'],
  ['reviewed', 'reviewed by'], ['reviewed by', 'reviewed'], ['resolved', 'resolved by'], ['resolved by', 'resolved'], ['explained by', 'explains'], ['explains', 'explained by'],
  ['reported', 'reported by'], ['reported by', 'reported'], ['reported on', 'reported by'], ['tracked', 'tracked by'], ['tracked by', 'tracked'],
  ['responded to', 'response by'], ['intercepted', 'intercepted by'], ['filmed', 'filmed by'], ['photographed', 'photographed by'],
  ['occurred at', 'site of'], ['site of', 'occurred at'], ['occurred near', 'near'], ['near', 'near'], ['same area as', 'same area as'],
  ['similar to', 'similar to'], ['same pattern as', 'same pattern as'], ['same as', 'same as'], ['equivalent of', 'equivalent of'],
  ['led to', 'followed from'], ['followed from', 'led to'], ['prompted', 'prompted by'], ['prompted by', 'prompted'], ['grew out of', 'grew into'],
  ['continued the work of', 'work continued by'], ['spun off from', 'spin-off'], ['replaced', 'replaced by'], ['replaced by', 'replaced'],
  ['allegedly involves', 'allegedly involved in'], ['alleged program', 'alleged by'], ['claimed by', 'claims'], ['claims about', 'claims by'], ['claimed from', 'claimed in'],
  ['cleared in', 'cleared'], ['disputed by', 'disputes'], ['refutes claim in', 'claim refuted by'], ['debunked', 'debunked by'], ['debunked by', 'debunked'],
  // programs, organisations, places
  ['part of', 'includes'], ['includes', 'part of'], ['based at', 'home of'], ['home of', 'based at'], ['located at', 'location of'], ['located in', 'location of'],
  ['run from', 'ran'], ['successor to', 'succeeded by'], ['predecessor of', 'preceded'], ['type of', 'subtypes'], ['used by', 'used'], ['used', 'used by'],
  ['tested at', 'test site for'], ['test site for', 'tested at'], ['parent of', 'subunit of'], ['subunit of', 'parent of'], ['reports to', 'oversees'], ['oversees', 'reports to'],
  ['holds records of', 'records held by'], ['records', 'recorded by'], ['recorded in', 'records'], ['issued by', 'issued'], ['issued', 'issued by'], ['releases', 'released by'],
  ['released in', 'released'], ['released by', 'released'], ['paired with', 'paired with'],
  // documents, hearings, media
  ['about', 'subject of'], ['subject of', 'about'], ['features', 'appears in'], ['appears in', 'features'], ['documented in', 'documents'], ['documents', 'documented in'], ['documented', 'documented in'],
  ['testimony by', 'testified in'], ['testified at', 'testified at'], ['testified to', 'received testimony from'], ['spoke at', 'speakers'], ['speaker', 'speaker at'],
  ['questioned at', 'questioned'], ['questioned witnesses at', 'questioners'], ['authored', 'authored by'], ['authored by', 'authored'], ['co-author', 'co-authored'],
  ['published', 'published by'], ['published by', 'published'], ['produced', 'produced by'], ['produced by', 'produced'], ['produced for', 'commissioned'],
  ['narrated by', 'narrated'], ['edited by', 'edited'], ['foreword by', 'wrote foreword for'], ['directed film', 'film by'], ['presented', 'presented by'], ['presented by', 'presented'], ['submitted', 'submitted by'], ['submitted by', 'submitted'],
  ['submitted to', 'received'], ['raised by', 'raised'], ['noted by', 'noted'], ['discussed by', 'discusses'], ['discusses', 'discussed in'], ['cited in', 'cites'], ['cites', 'cited in'],
  ['quoted in', 'quotes'], ['quotes', 'quoted in'], ['defined in', 'defines'], ['defines', 'defined in'], ['assessed in', 'assesses'], ['names', 'named in'], ['mentions', 'mentioned in'],
  ['recording of', 'recordings'], ['transcript of', 'transcript'], ['trailer of', 'trailer'], ['found among papers of', 'papers contained'], ['contributed to', 'contributions from'],
  ['statement about', 'statements by'], ['speaks in', 'speakers'], ['interviewed in', 'interviewed'], ['covered by', 'covered'], ['covered', 'covered by'], ['basis for', 'based on'], ['based on', 'basis for'],
  ['response to', 'response'], ['supported by', 'supported'], ['supported', 'supported by'], ['answered', 'answered by'], ['requested', 'requested by'], ['requested by', 'requested'], ['obtained', 'obtained by'], ['obtained by', 'obtained'],
  ['leaked', 'leaked by'], ['declassified', 'declassified by'], ['declassified by', 'declassified'], ['mandated', 'mandated by'], ['mandated by', 'mandated'], ['established', 'established by'], ['established by', 'established'],
  // added in the 2026-10 review of "related to" links
  ['portrays', 'portrayed in'], ['example', 'example of'], ['example of', 'example'], ['term used by', 'uses the term'], ['alleges', 'alleged by'], ['alleged by', 'alleges'],
  ['misattributed to', 'misattributed record'], ['wrongly linked to', 'wrongly linked'], ['analyses', 'analysed in'], ['covers', 'covered in'], ['covered in', 'covers'],
  ['testimony on', 'testimony in'], ['written with', 'co-wrote'], ['case file of', 'case files'], ['preceded', 'preceded by'], ['attended by', 'attended'], ['attended', 'attended by'],
  ['backed by', 'backed'], ['backed', 'backed by'], ['sold by', 'sold'], ['attributed to', 'attributed'], ['involves', 'involved in'], ['involved in', 'involves'],
  ['urged reopening', 'reopening urged by'], ['released files of', 'files released in'], ['same director', 'same director'], ['shares crew with', 'shares crew with'],
  ['examined', 'examined at'], ['alleged case of', 'alleged cases'], ['presented at', 'presented'], ['same witness as', 'same witness as'], ['same base as', 'same base as'],
  ['same night as', 'same night as'], ['same region as', 'same region as'], ['same case as', 'same case as'], ['recorded by', 'recorded'], ['assessed by', 'assessed'], ['assessed', 'assessed by'],
  ['raised with', 'asked about'], ['asked about', 'raised by'], ['raised', 'raised by'], ['reported to', 'received reports of'], ['claims by', 'claims about'],
  ['vouched for by', 'vouches for'], ['followed up by', 'followed up'], ['addressed by', 'addressed'], ['allegedly taken to', 'allegedly received'], ['alleged start of', 'allegedly began with'],
  ['mentioned in', 'mentions'], ['its historian wrote', 'by historian of'], ['allegedly studied', 'allegedly studied by'], ['launches during', 'during launches of'],
  ['cites as model', 'model for'], ['represented on', 'included staff of'], ['defined in bill', 'defined in bill by'], ['untraced quote on', 'untraced quote by'],
  ['collected cases of', 'cases collected by'], ['described in', 'describes'], ['commented on', 'comments by'], ['named in', 'names'], ['named by', 'named'], ['named with', 'named with'],
  ['partly accepts', 'partly accepted by'], ['provided video of', 'video provided by'], ['links to', 'linked by'], ['researched', 'researched by'], ['researched by', 'researched'],
  ['convinced by', 'convinced'], ['alleged forgery on', 'alleged forgery by'], ['called unresolved', 'called unresolved by'], ['reportedly explained', 'reportedly explained by'],
  ['credits', 'credited by'], ['allegedly negotiated with', 'allegedly negotiated with'], ['encouraged by', 'encouraged'], ['questioned by', 'questioned'],
  ['visited Eglin with', 'visited Eglin with'], ['interviewed by', 'interviewed'], ['fellow witness', 'fellow witness'], ['cited by', 'cited'], ['co-sponsored with', 'co-sponsored with'],
  ['contacted by', 'contacted'], ['introduced by', 'introduced'], ['briefed by', 'briefed'], ['doubted by', 'doubts'], ['friend of', 'friend of'], ['chronicled', 'chronicled by'],
  ['allegedly blocked', 'allegedly blocked by'], ['funded program of', 'program funded by'], ['contracted', 'contracted by'], ['account relayed by', 'relayed account of'],
  ['talked with', 'talked with'], ['case briefed by', 'briefed case of'], ['sent to intercept', 'sent to intercept by'], ['questions account of', 'account questioned by'],
  ['sourced from', 'source for'], ['disinformed by', 'disinformed'], ['endorsed by', 'endorsed'], ['checked claims of', 'claims checked by'], ['testified with', 'testified with'],
  ['entered report by', 'report entered by'], ['story repeated by', 'repeated story of'], ['advised by', 'advised'], ['informed by', 'informed'], ['witness at', 'witnesses'],
  ['funded research at', 'research funded by'], ['sent investigator to', 'investigator sent by'], ['made film on', 'film by'], ['recommended end of', 'ending urged by'],
  ['criticised', 'criticised by'], ['named as gatekeeper of', 'gatekeeper named'], ['allegedly involved in', 'allegedly involves'], ['records sought from', 'asked for records by'],
  ['testified on', 'testimony from'], ['origin of', 'issued at'], ['issued at', 'origin of'], ['discussed at', 'discussed'], ['destination for', 'sent to'], ['sent to', 'destination for'],
  ['launch site for', 'launches from'], ['allegedly run as', 'alleged form of'], ['alleged in', 'alleges'], ['proposal for', 'proposed as'], ['prepared for', 'commissioned'],
  ['prepared by', 'prepared'], ['concerns', 'concerned in'], ['filmed by', 'filmed'],
  // where the official record and an account differ: say so in the label
  ['another name for', 'also called'], ['says he led', 'leadership claimed by'], ['says he co-founded', 'co-founding claimed by'], ['managed by', 'managed'],
  ['copy held as', 'copy of'],
  // claims
  ['evidence for', 'evidence for claim'], ['evidence against', 'evidence against claim'], ['narrower than', 'broader than'], ['broader than', 'narrower than'],
  ['depends on', 'basis of'], ['contradicts', 'contradicts'], ['asserts', 'asserted by'], ['disputes claim', 'disputed by'], ['comments on claim', 'comments by'],
];

export const INVERSE = Object.fromEntries(PAIRS);
export const KNOWN = new Set(PAIRS.flat());
