export type Locale = 'ca' | 'es';

const messages = {
  ca: {
    appName: 'Amic Invisible',
    common: {
      cancel: 'Cancel·lar',
      confirm: 'Confirmar',
      ok: "D'acord",
      copy: 'Copiar',
      open: 'Obrir enllaç',
      copied: 'Copiat!',
    },
    landing: {
      eyebrow: 'Sorteig familiar',
      titleFirst: 'Amic',
      titleLast: 'Invisible',
      subtitle:
        "Organitza el teu amic invisible, reparteix els regals en secret i envia-ho tot per WhatsApp. Sense spoilers.",
      organize: 'Organitza un sorteig',
      admin: "Panell d'administració",
      features: {
        phoneTitle: 'Telèfon compartit',
        phoneDesc: 'Exclusions automàtiques si dos participants comparteixen número.',
        antispTitle: 'Anti-spoiler',
        antispDesc: 'Ningú veu la seva parella fins que revela la targeta.',
        waTitle: 'WhatsApp',
        waDesc: "Enviament automàtic de missatges amb enllaç privat.",
      },
    },
    reveal: {
      greeting: 'Hola, {name}',
      cardTitle: 'Toca la targeta per revelar el teu regal',
      seenBefore: 'Ja ho has revelat abans',
      isPerson: 'és la persona a qui has de regalar',
      reveal: 'Revelar el meu regal 🎉',
      revealing: 'Revelant…',
      date: 'Data',
      location: 'Lloc',
      budget: 'Pressupost',
      rules: 'Normes',
      dateUndefined: 'Dia no definit, pendent per determinar',
      locationUndefined: 'Lloc no definit, pendent per determinar',
      budgetUndefined: 'Pressupost no definit, pendent per determinar',
      rulesUndefined: 'Normes no definides, pendents per determinar',
      error: 'Alguna cosa ha fallat',
      connectError: "No s'ha pogut connectar amb el servidor",
    },
    login: {
      title: "Panell d'administració",
      password: 'Contrasenya',
      wrong: 'Contrasenya incorrecta',
      connectError: "No s'ha pogut connectar",
      submitting: 'Entrant…',
      submit: 'Entrar',
    },
    admin: {
      subtitle: "Panell d'administració",
      antiSpoiler: 'Anti-spoiler',
      logout: 'Sortir',
      archive: 'Arxivar',
      modal: {
        deleteTitle: 'Eliminar esdeveniment',
        archiveTitle: 'Arxivar el sorteig',
        archiveMessage:
          "Segur que vols arxivar aquest sorteig? Aquesta acció no es pot desfer i quedarà tancat.",
        unlinkTitle: 'Desvincular WhatsApp',
        unlinkMessage:
          "Segur que vols desvincular aquest WhatsApp? Hauràs de tornar a escanejar el QR.",
        linkTitle: "Enllaç del participant",
        drawTitle: 'Fer el sorteig',
        drawMessage:
          "Segur que vols fer el sorteig? S'assignaran els regals i ja no es podrà editar res.",
        drawErrorTitle: 'Error al sortejar',
        sendErrorTitle: 'Error en enviar',
        addErrorTitle: 'Error en afegir',
      },
      newEvent: {
        title: 'Nou esdeveniment',
        fieldTitle: 'Títol *',
        titlePlaceholder: 'Amic invisible 2026',
        date: 'Data i hora',
        location: 'Lloc',
        locationPlaceholder: "Casa l'àvia",
        budget: 'Pressupost',
        budgetPlaceholder: '25€',
        rules: 'Normes',
        rulesPlaceholder: 'Res de regals usats…',
        template:
          'Plantilla de missatge (variables: {name} {friend} {title} {date} {location} {budget} {rules} {link})',
        avoidTwoCycles: 'Evitar cicles de 2 (A regala a B i B regala a A)',
        submit: 'Crear esdeveniment',
      },
      events: {
        title: 'Esdeveniments',
        loading: 'Carregant…',
        empty: 'Encara no hi ha cap esdeveniment.',
        withoutDate: 'Sense data',
        participants: '{n} participants',
        clone: 'Clonar',
        delete: 'Eliminar',
      },
      status: {
        DRAFT: 'Esborrany',
        ACTIVE: 'Actiu',
        ARCHIVED: 'Arxivat',
      },
      waha: {
        title: 'WhatsApp (WAHA)',
        notConfigured: 'WAHA_URL no configurada.',
        connected: 'Connectat.',
        refresh: 'Refrescar QR',
        hint: 'Escaneja amb WhatsApp per vincular el número. Sessió: default',
        linked: 'Vinculat: {phone}',
        unlink: 'Desvincular',
      },
      detail: {
        back: '← Tornar',
        location: 'Lloc',
        budget: 'Pressupost',
        avoidTwoCycles: 'Evitar cicles de 2',
        draw: '🎲 Fer el sorteig',
        needParticipants: 'Calen almenys 2 participants per sortejar.',
        activeHint: "Sorteig actiu: només pots enviar els WhatsApp i comprovar qui l'ha revelat.",
        archivedHint: 'Sorteig arxivat i tancat.',
      },
      participants: {
        title: 'Participants ({n})',
        help: 'Format per afegir: «Nom, telèfon» (una línia per participant).',
        placeholder: 'Anna, 600112233\nPere, 611223344',
        add: 'Afegir participants',
        colName: 'Nom',
        colPhone: 'Telèfon',
        colGivesTo: 'Regala a',
        colWhatsapp: 'WhatsApp',
        colViewed: 'Vist',
        colActions: 'Accions',
        actionLink: 'Enllaç',
        actionSend: 'Enviar',
      },
      send: {
        queue: 'Enviar a tots per WhatsApp (cua)',
        sending: 'Enviant {index}/{total} ({name})…',
        hint: "S'envia un a un amb un retard aleatori de 3–5 s. Si falla, s'obre el botó wa.me.",
      },
      exclusions: {
        title: 'Exclusions manuals',
        help: "Impedeix que algú regali a una persona concreta. Les de telèfon compartit (SAME_PHONE) són automàtiques.",
        who: 'Qui',
        whoGives: 'Qui regala',
        notTo: 'no regala a',
        whoReceives: 'Qui rep',
        add: 'Afegir exclusió',
        cannotGive: '{giver} no pot regalar a {receiver}',
      },
      errors: {
        loadEvents: "No s'han pogut carregar els esdeveniments",
        createEvent: 'Error en crear',
        titleRequired: 'El títol és obligatori',
        drawFail: 'Error al sortejar',
        sendFail: 'Error en enviar',
        addFail: 'Error en afegir',
        noParticipants: "No s'ha pogut crear cap participant",
        confirmDelete:
          "Segur que vols eliminar aquest esdeveniment? Aquesta acció no es pot desfer.",
        linkCopied: 'Enllaç copiat: {url}',
        drawNotEnough: 'Cal afegir com a mínim 2 participants per fer el sorteig.',
        drawEmptyDomain:
          "Sense solució: hi ha participants que no poden regalar a ningú per les exclusions. Revisa les exclusions manuals o de telèfon compartit.",
        drawNoSolution:
          "No s'ha trobat cap combinació vàlida amb les restriccions actuals (auto-exclusió, telèfon compartit, exclusions manuals i/o evitar cicles de 2). Prova de treure alguna restricció.",
      },
    },
  },
  es: {
    appName: 'Amigo Invisible',
    common: {
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      ok: 'Aceptar',
      copy: 'Copiar',
      open: 'Abrir enlace',
      copied: 'Copiado!',
    },
    landing: {
      eyebrow: 'Sorteo familiar',
      titleFirst: 'Amigo',
      titleLast: 'Invisible',
      subtitle:
        'Organiza tu amigo invisible, reparte los regalos en secreto y envíalo todo por WhatsApp. Sin spoilers.',
      organize: 'Organiza un sorteo',
      admin: 'Panel de administración',
      features: {
        phoneTitle: 'Teléfono compartido',
        phoneDesc: 'Exclusiones automáticas si dos participantes comparten número.',
        antispTitle: 'Anti-spoiler',
        antispDesc: 'Nadie ve su pareja hasta que revela la tarjeta.',
        waTitle: 'WhatsApp',
        waDesc: 'Envío automático de mensajes con enlace privado.',
      },
    },
    reveal: {
      greeting: 'Hola, {name}',
      cardTitle: 'Toca la tarjeta para revelar tu regalo',
      seenBefore: 'Ya lo has revelado antes',
      isPerson: 'es la persona a quien tienes que regalar',
      reveal: 'Revelar mi regalo 🎉',
      revealing: 'Revelando…',
      date: 'Fecha',
      location: 'Lugar',
      budget: 'Presupuesto',
      rules: 'Normas',
      dateUndefined: 'Día no definido, pendiente por determinar',
      locationUndefined: 'Lugar no definido, pendiente por determinar',
      budgetUndefined: 'Presupuesto no definido, pendiente por determinar',
      rulesUndefined: 'Normas no definidas, pendientes por determinar',
      error: 'Algo ha fallado',
      connectError: 'No se ha podido conectar con el servidor',
    },
    login: {
      title: 'Panel de administración',
      password: 'Contraseña',
      wrong: 'Contraseña incorrecta',
      connectError: 'No se ha podido conectar',
      submitting: 'Entrando…',
      submit: 'Entrar',
    },
    admin: {
      subtitle: 'Panel de administración',
      antiSpoiler: 'Anti-spoiler',
      logout: 'Salir',
      archive: 'Archivar',
      modal: {
        deleteTitle: 'Eliminar evento',
        archiveTitle: 'Archivar el sorteo',
        archiveMessage:
          '¿Seguro que quieres archivar este sorteo? Esta acción no se puede deshacer y quedará cerrado.',
        unlinkTitle: 'Desvincular WhatsApp',
        unlinkMessage:
          '¿Seguro que quieres desvincular este WhatsApp? Tendrás que volver a escanear el QR.',
        linkTitle: 'Enlace del participante',
        drawTitle: 'Hacer el sorteo',
        drawMessage:
          '¿Seguro que quieres hacer el sorteo? Se asignarán los regalos y ya no se podrá editar nada.',
        drawErrorTitle: 'Error al sortear',
        sendErrorTitle: 'Error al enviar',
        addErrorTitle: 'Error al añadir',
      },
      newEvent: {
        title: 'Nuevo evento',
        fieldTitle: 'Título *',
        titlePlaceholder: 'Amigo invisible 2026',
        date: 'Fecha y hora',
        location: 'Lugar',
        locationPlaceholder: 'Casa de la abuela',
        budget: 'Presupuesto',
        budgetPlaceholder: '25€',
        rules: 'Normas',
        rulesPlaceholder: 'Nada de regalos usados…',
        template:
          'Plantilla de mensaje (variables: {name} {friend} {title} {date} {location} {budget} {rules} {link})',
        avoidTwoCycles: 'Evitar ciclos de 2 (A regala a B y B regala a A)',
        submit: 'Crear evento',
      },
      events: {
        title: 'Eventos',
        loading: 'Cargando…',
        empty: 'Aún no hay ningún evento.',
        withoutDate: 'Sin fecha',
        participants: '{n} participantes',
        clone: 'Clonar',
        delete: 'Eliminar',
      },
      status: {
        DRAFT: 'Borrador',
        ACTIVE: 'Activo',
        ARCHIVED: 'Archivado',
      },
      waha: {
        title: 'WhatsApp (WAHA)',
        notConfigured: 'WAHA_URL no configurada.',
        connected: 'Conectado.',
        refresh: 'Refrescar QR',
        hint: 'Escanea con WhatsApp para vincular el número. Sesión: default',
        linked: 'Vinculado: {phone}',
        unlink: 'Desvincular',
      },
      detail: {
        back: '← Volver',
        location: 'Lugar',
        budget: 'Presupuesto',
        avoidTwoCycles: 'Evitar ciclos de 2',
        draw: '🎲 Hacer el sorteo',
        needParticipants: 'Se necesitan al menos 2 participantes para sortear.',
        activeHint: 'Sorteo activo: solo puedes enviar los WhatsApp y comprobar quién lo ha revelado.',
        archivedHint: 'Sorteo archivado y cerrado.',
      },
      participants: {
        title: 'Participantes ({n})',
        help: 'Formato para añadir: «Nombre, teléfono» (una línea por participante).',
        placeholder: 'Anna, 600112233\nPere, 611223344',
        add: 'Añadir participantes',
        colName: 'Nombre',
        colPhone: 'Teléfono',
        colGivesTo: 'Regala a',
        colWhatsapp: 'WhatsApp',
        colViewed: 'Visto',
        colActions: 'Acciones',
        actionLink: 'Enlace',
        actionSend: 'Enviar',
      },
      send: {
        queue: 'Enviar a todos por WhatsApp (cola)',
        sending: 'Enviando {index}/{total} ({name})…',
        hint: 'Se envía uno a uno con un retardo aleatorio de 3–5 s. Si falla, se abre el botón wa.me.',
      },
      exclusions: {
        title: 'Exclusiones manuales',
        help: 'Impide que alguien regale a una persona concreta. Las de teléfono compartido (SAME_PHONE) son automáticas.',
        who: 'Quién',
        whoGives: 'Quién regala',
        notTo: 'no regala a',
        whoReceives: 'Quién recibe',
        add: 'Añadir exclusión',
        cannotGive: '{giver} no puede regalar a {receiver}',
      },
      errors: {
        loadEvents: 'No se han podido cargar los eventos',
        createEvent: 'Error al crear',
        titleRequired: 'El título es obligatorio',
        drawFail: 'Error al sortear',
        sendFail: 'Error al enviar',
        addFail: 'Error al añadir',
        noParticipants: 'No se ha podido crear ningún participante',
        confirmDelete:
          '¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.',
        linkCopied: 'Enlace copiado: {url}',
        drawNotEnough: 'Hay que añadir como mínimo 2 participantes para hacer el sorteo.',
        drawEmptyDomain:
          'Sin solución: hay participantes que no pueden regalar a nadie por las exclusiones. Revisa las exclusiones manuales o de teléfono compartido.',
        drawNoSolution:
          'No se ha encontrado ninguna combinación válida con las restricciones actuales (auto-exclusión, teléfono compartido, exclusiones manuales y/o evitar ciclos de 2). Prueba a quitar alguna restricción.',
      },
    },
  },
} as const;

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dict);
}

export function t(locale: Locale, key: string): string {
  const value = lookup(messages[locale], key);
  return typeof value === 'string' ? value : key;
}

export function makeT(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let s = t(locale, key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return s;
  };
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  const lang = (acceptLanguage || '').toLowerCase();
  return lang.includes('ca') ? 'ca' : 'es';
}
