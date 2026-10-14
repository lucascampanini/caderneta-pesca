// Gerado por ferramentas/rios/fatores_caderneta.js a partir de src/data.js da Caderneta. Não edite à mão.
// c: clima (sol, nublado, chuva, pre = pré-frente, pos = pós-frente) · n: nível · a: água · onde: dica por nível
export const FATORES = {
 "pintado": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": -1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": -1,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Beiras de barranco recém-alagadas e entradas de corixo, onde a tuvira se esconde no capim.",
   "cheio": "Espalhado no campo alagado e difícil de achar. Concentre-se em bocas de baía com água corrente.",
   "baixando": "Melhor fase. Saídas de baía e de corixo no rio, onde ele espera a tuvira que deixa o campo.",
   "seco": "Poços fundos do canal e pauleira afundada de dia. Praias rasas à noite."
  }
 },
 "cachara": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": -1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Beiras recém-alagadas e capim das entradas de corixo.",
   "cheio": "Bocas de baía com água corrente e beiras de vegetação.",
   "baixando": "Saídas de baía e corixo, e praias que vão aparecendo no fim da tarde.",
   "seco": "Pauleira e poços do canal de dia; praias e rasos a partir do entardecer."
  }
 },
 "jau": {
  "c": {
   "sol": -1,
   "nublado": 0,
   "chuva": 1,
   "pre": 2,
   "pos": -2
  },
  "n": {
   "subindo": 0,
   "cheio": -1,
   "baixando": 2,
   "seco": 2
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Poços de remanso abaixo de corredeiras.",
   "cheio": "Pés de cachoeira e poços de pedra.",
   "baixando": "Poços fundos do canal e pedreiras com correnteza.",
   "seco": "Poços fundos de pedra; é a melhor época para tentar."
  }
 },
 "barbado": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 0,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": -1,
   "verde": 1,
   "barrenta": 2
  },
  "onde": {
   "subindo": "Beira de barranco no canal, onde a água barrenta entra.",
   "cheio": "Canal principal, atrás de bancos de areia.",
   "baixando": "Canal e encontros de água, em cardume.",
   "seco": "Poços do canal com fundo de areia."
  }
 },
 "jurupoca": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": 0,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Bocas de corixo e beira de vegetação.",
   "cheio": "Bocas de baía com corrente.",
   "baixando": "Saídas de baía e praias que estão aparecendo.",
   "seco": "Praias rasas e beira de barranco à noite."
  }
 },
 "jurupensem": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": 0,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Remansos de beira.",
   "cheio": "Baías ligadas ao rio.",
   "baixando": "Saídas de baía e remansos.",
   "seco": "Praias e remansos à noite."
  }
 },
 "palmito": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 0,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Remansos de beira.",
   "cheio": "Baías.",
   "baixando": "Remansos atrás de bancos e saídas de baía.",
   "seco": "Remansos e poços de beira."
  }
 },
 "armado": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 1
  },
  "onde": {
   "subindo": "Bocas de corixo e beira de barranco.",
   "cheio": "Remansos do canal e bocas de baía.",
   "baixando": "Canal principal, logo abaixo das saídas de baía.",
   "seco": "Poços do canal, à noite."
  }
 },
 "pati": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 2,
   "cheio": 1,
   "baixando": 2,
   "seco": 0
  },
  "a": {
   "clara": -1,
   "verde": 1,
   "barrenta": 2
  },
  "onde": {
   "subindo": "Canal com água barrenta e correnteza.",
   "cheio": "Beira do canal e bocas de corixo.",
   "baixando": "Canal principal na saída das baías.",
   "seco": "Poços fundos do canal."
  }
 },
 "mandi": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 2,
   "cheio": 1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 2
  },
  "onde": {
   "subindo": "Beira de barranco com água turvando.",
   "cheio": "Remansos e bocas de corixo.",
   "baixando": "Barrancos do canal no fim da tarde.",
   "seco": "Poços de beira e remansos à noite."
  }
 },
 "pacu": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -2
  },
  "n": {
   "subindo": 2,
   "cheio": 2,
   "baixando": 1,
   "seco": -1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Margens com frutíferas começando a alagar. É a época da fruta.",
   "cheio": "Dentro da mata alagada e sob frutíferas; procure o barulho da fruta caindo.",
   "baixando": "Galhada e remansos na saída das baías; troque a fruta pelo caranguejo.",
   "seco": "Poços com galhada e remansos fundos. Caranguejo e massa no fundo."
  }
 },
 "pacupeva": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 1,
   "pos": -2
  },
  "n": {
   "subindo": 1,
   "cheio": 2,
   "baixando": 1,
   "seco": 0
  },
  "a": {
   "clara": 1,
   "verde": 1,
   "barrenta": -1
  },
  "onde": {
   "subindo": "Beiras com vegetação recém-alagada.",
   "cheio": "Baías e mata alagada.",
   "baixando": "Saídas de baía.",
   "seco": "Remansos com vegetação."
  }
 },
 "piavucu": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 1,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Beira de barranco com vegetação.",
   "cheio": "Canais e baías.",
   "baixando": "Barrancos do canal e pés de cachoeira.",
   "seco": "Poços de beira com fundo limpo."
  }
 },
 "trespintas": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": 1,
   "baixando": 2,
   "seco": 2
  },
  "a": {
   "clara": 2,
   "verde": 1,
   "barrenta": -1
  },
  "onde": {
   "subindo": "Remansos laterais com água mais limpa.",
   "cheio": "Beira de baía e pés de corredeira.",
   "baixando": "Pés de corredeira e barrancos com pedra.",
   "seco": "Remansos e poços de água clara."
  }
 },
 "piapara": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 1,
   "verde": 2,
   "barrenta": -1
  },
  "onde": {
   "subindo": "Remansos laterais.",
   "cheio": "Beiras de canal e bocas de baía.",
   "baixando": "Corredeiras e remansos de fundo de areia.",
   "seco": "Poços de corredeira cevados."
  }
 },
 "piraputanga": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": -1,
   "pre": 1,
   "pos": -1
  },
  "n": {
   "subindo": -1,
   "cheio": 0,
   "baixando": 1,
   "seco": 2
  },
  "a": {
   "clara": 2,
   "verde": 0,
   "barrenta": -2
  },
  "onde": {
   "subindo": "Água turvando: procure remansos laterais mais limpos.",
   "cheio": "Remansos sob frutíferas.",
   "baixando": "Corredeiras e remansos de água clara.",
   "seco": "Corredeiras rasas e poços claros."
  }
 },
 "dourado": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": -1,
   "cheio": -1,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 1,
   "verde": 1,
   "barrenta": -1
  },
  "onde": {
   "subindo": "Água suja espalha o dourado. Procure encontros onde entra água mais limpa.",
   "cheio": "Saídas de baía com correnteza e água limpa.",
   "baixando": "Melhor fase. Saídas de corixo e de baía, onde ele espera o sairu que deixa o campo.",
   "seco": "Corredeiras, pontas de pedra e poços logo abaixo."
  }
 },
 "traira": {
  "c": {
   "sol": -1,
   "nublado": 1,
   "chuva": 1,
   "pre": 1,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 1,
   "baixando": 1,
   "seco": 0
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Capim recém-alagado nas beiras.",
   "cheio": "Baceiro e aguapé das baías.",
   "baixando": "Corixos e baías rasas que estão secando.",
   "seco": "Lagoas e poças com vegetação."
  }
 },
 "piranha": {
  "c": {
   "sol": 1,
   "nublado": 0,
   "chuva": 0,
   "pre": 1,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": 0,
   "baixando": 1,
   "seco": 2
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Beiras de remanso.",
   "cheio": "Baías.",
   "baixando": "Remansos e beira de barranco.",
   "seco": "Poços e baías isoladas, onde se concentra."
  }
 },
 "curimbata": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 1,
   "pos": -1
  },
  "n": {
   "subindo": 1,
   "cheio": 1,
   "baixando": 1,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Remansos de barranco.",
   "cheio": "Baías e remansos.",
   "baixando": "Barrancos e remansos.",
   "seco": "Remansos com fundo de lodo."
  }
 },
 "cachorra": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": 0,
   "baixando": 2,
   "seco": 1
  },
  "a": {
   "clara": 1,
   "verde": 1,
   "barrenta": -1
  },
  "onde": {
   "subindo": "Encontros de água.",
   "cheio": "Saídas de baía.",
   "baixando": "Corredeiras e encontros.",
   "seco": "Corredeiras e beira de canal."
  }
 },
 "tucunare": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -2
  },
  "n": {
   "subindo": 0,
   "cheio": -1,
   "baixando": 1,
   "seco": 1
  },
  "a": {
   "clara": 1,
   "verde": 1,
   "barrenta": -1
  },
  "onde": {
   "subindo": "Bocas de lagoa e beiras com pauleira.",
   "cheio": "Dentro da vegetação alagada: difícil.",
   "baixando": "Pontas de ilha e saídas de lagoa.",
   "seco": "Pauleira, pedras e praias rasas."
  }
 },
 "corvina": {
  "c": {
   "sol": 0,
   "nublado": 1,
   "chuva": 0,
   "pre": 2,
   "pos": -1
  },
  "n": {
   "subindo": 0,
   "cheio": 0,
   "baixando": 1,
   "seco": 1
  },
  "a": {
   "clara": 0,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Beira de canal.",
   "cheio": "Canais fundos.",
   "baixando": "Beiras de canal e encontros.",
   "seco": "Fundo de represa e poços."
  }
 },
 "tilapia": {
  "c": {
   "sol": 1,
   "nublado": 0,
   "chuva": 0,
   "pre": 1,
   "pos": -2
  },
  "n": {
   "subindo": 0,
   "cheio": 0,
   "baixando": 1,
   "seco": 1
  },
  "a": {
   "clara": 1,
   "verde": 1,
   "barrenta": 0
  },
  "onde": {
   "subindo": "Margens rasas.",
   "cheio": "Margens com vegetação.",
   "baixando": "Remansos.",
   "seco": "Margens rasas e ensolaradas."
  }
 }
};
