"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { File, Link2, Paperclip, Save, Search, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/shared/template-selector";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ordemServicoSchema, type OrdemServicoFormData } from "@/schemas/ordem-servico-schema";
import { combinarComTextoAtual } from "@/lib/templates";
import { statusLabels } from "@/lib/os-labels";
import type { Cliente, OrdemServico, PrioridadeOS, Projeto, Usuario } from "@/types";

const responsavelNaoAtribuido = "__none__";
const projetoNaoVinculado = "__none__";
const extensoesPermitidas = new Set(["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xls", "xlsx"]);
const tamanhoMaximoAnexo = 10 * 1024 * 1024;
const quantidadeMaximaAnexos = 20;

const prioridades: { value: PrioridadeOS; label: string }[] = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Critica" }
];

export type OrdemServicoFormComplementos = {
  anexos: File[];
  ordemServicoIds: string[];
};

type OrdemServicoFormProps = {
  clientes: Pick<Cliente, "id" | "nome">[];
  responsaveis: Pick<Usuario, "id" | "nome">[];
  projetos: Pick<Projeto, "id" | "nome" | "clienteId">[];
  ticketsRelacionaveis?: Pick<OrdemServico, "id" | "codigo" | "titulo" | "status">[];
  mostrarComplementos?: boolean;
  ordem?: OrdemServico | null;
  isSubmitting?: boolean;
  onSubmit: (data: OrdemServicoFormData, complementos: OrdemServicoFormComplementos) => void;
  prioridadePadrao?: PrioridadeOS;
  responsavelPadraoId?: string | null;
  permitirSemResponsavel?: boolean;
};

export function OrdemServicoForm({ clientes, responsaveis, projetos, ticketsRelacionaveis = [], mostrarComplementos = false, ordem, isSubmitting = false, onSubmit, prioridadePadrao = "MEDIA", responsavelPadraoId = null, permitirSemResponsavel = true }: OrdemServicoFormProps) {
  const [anexos, setAnexos] = useState<File[]>([]);
  const [erroAnexos, setErroAnexos] = useState("");
  const [buscaTicket, setBuscaTicket] = useState("");
  const [ordemServicoIds, setOrdemServicoIds] = useState<string[]>([]);
  const form = useForm<OrdemServicoFormData>({
    resolver: zodResolver(ordemServicoSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      clienteId: "",
      responsavelId: "",
      projetoId: "",
      prioridade: prioridadePadrao,
      prazo: "",
      prazoIndefinido: false
    }
  });
  const clienteId = form.watch("clienteId");
  const prazoIndefinido = form.watch("prazoIndefinido");
  const projetosDoCliente = useMemo(() => {
    return projetos.filter((projeto) => !projeto.clienteId || projeto.clienteId === clienteId);
  }, [clienteId, projetos]);
  const ticketsFiltrados = useMemo(() => {
    const termo = buscaTicket.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return ticketsRelacionaveis;
    return ticketsRelacionaveis.filter((ticket) => `${ticket.codigo} ${ticket.titulo}`.toLocaleLowerCase("pt-BR").includes(termo));
  }, [buscaTicket, ticketsRelacionaveis]);

  function selecionarAnexos(event: ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(event.target.files ?? []);
    const chavesExistentes = new Set(anexos.map((arquivo) => `${arquivo.name}:${arquivo.size}:${arquivo.lastModified}`));
    const invalidos: string[] = [];
    const validos = selecionados.filter((arquivo) => {
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
      const valido = extensoesPermitidas.has(extensao) && arquivo.size <= tamanhoMaximoAnexo;
      if (!valido) invalidos.push(arquivo.name);
      return valido && !chavesExistentes.has(`${arquivo.name}:${arquivo.size}:${arquivo.lastModified}`);
    });
    const vagas = Math.max(0, quantidadeMaximaAnexos - anexos.length);
    const adicionados = validos.slice(0, vagas);

    setAnexos((atuais) => [...atuais, ...adicionados]);
    if (invalidos.length > 0) {
      setErroAnexos(`Arquivos ignorados por tipo ou tamanho: ${invalidos.join(", ")}.`);
    } else if (validos.length > vagas) {
      setErroAnexos(`O limite é de ${quantidadeMaximaAnexos} anexos por ticket.`);
    } else {
      setErroAnexos("");
    }
    event.target.value = "";
  }

  function alternarTicket(id: string, selecionado: boolean) {
    setOrdemServicoIds((atuais) => selecionado
      ? [...atuais, id]
      : atuais.filter((idAtual) => idAtual !== id));
  }

  useEffect(() => {
    form.reset({
      titulo: ordem?.titulo ?? "",
      descricao: ordem?.descricao ?? "",
      clienteId: ordem?.clienteId ?? "",
      responsavelId: ordem?.responsavelId ?? responsavelPadraoId ?? "",
      projetoId: ordem?.projetoId ?? "",
      prioridade: ordem?.prioridade ?? prioridadePadrao,
      prazo: ordem?.prazo ?? "",
      prazoIndefinido: ordem ? ordem.prazoIndefinido || !ordem.prazo : false
    });
  }, [form, ordem, prioridadePadrao, responsavelPadraoId]);

  useEffect(() => {
    const projetoId = form.getValues("projetoId");
    if (projetoId && !projetosDoCliente.some((projeto) => projeto.id === projetoId)) {
      form.setValue("projetoId", "");
    }
  }, [form, projetosDoCliente]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data, { anexos, ordemServicoIds }))} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input aria-label="Titulo do ticket" placeholder="Resumo objetivo da demanda" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="clienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger aria-label="Cliente">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="responsavelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === responsavelNaoAtribuido ? "" : value)}
                  value={field.value || responsavelNaoAtribuido}
                >
                  <FormControl>
                    <SelectTrigger aria-label="Responsável">
                      <SelectValue placeholder="Atribuir depois" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {permitirSemResponsavel ? <SelectItem value={responsavelNaoAtribuido}>Atribuir depois</SelectItem> : null}
                    {responsaveis.map((responsavel) => (
                      <SelectItem key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="projetoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === projetoNaoVinculado ? "" : value)}
                  value={field.value || projetoNaoVinculado}
                >
                  <FormControl>
                    <SelectTrigger aria-label="Projeto">
                      <SelectValue placeholder="Sem projeto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={projetoNaoVinculado}>Sem projeto</SelectItem>
                    {projetosDoCliente.map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prioridade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger aria-label="Prioridade">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {prioridades.map((prioridade) => (
                      <SelectItem key={prioridade.value} value={prioridade.value}>
                        {prioridade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="prazoIndefinido"
              render={({ field }) => (
                <FormItem>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-primary"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">Sem prazo definido</span>
                      <span className="block text-xs text-muted-foreground">Mantenha o ticket aberto sem data de vencimento.</span>
                    </span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prazo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do prazo</FormLabel>
                  <FormControl>
                    <Input aria-label="Data do prazo" type="date" disabled={prazoIndefinido} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {prazoIndefinido
                      ? "Este ticket não aparecerá como vencido ou próximo do prazo."
                      : "Deixe vazio para aplicar automaticamente o SLA da prioridade."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descrição</FormLabel>
                <TemplateSelector
                  tipo="DESCRICAO_OS"
                  onApply={(conteudo) => form.setValue("descricao", combinarComTextoAtual(field.value, conteudo), { shouldDirty: true, shouldValidate: true })}
                />
                <FormControl>
                  <Textarea aria-label="Descricao do ticket" placeholder="Contexto, problema, expectativa e qualquer detalhe relevante" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {mostrarComplementos ? (
          <>
            <section className="space-y-4 border-t pt-5" aria-labelledby="anexos-iniciais-title">
              <div>
                <h2 id="anexos-iniciais-title" className="flex items-center gap-2 text-base font-semibold">
                  <Paperclip className="h-4 w-4" /> Central de anexos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Selecione os arquivos que devem acompanhar o ticket desde o cadastro.</p>
              </div>
              <label className="block space-y-2 text-sm font-medium">
                Arquivos
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,.xls,.xlsx"
                  className="block min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  onChange={selecionarAnexos}
                />
              </label>
              <p className="text-xs text-muted-foreground">PDF, imagens, texto e documentos Office. Até 10 MB por arquivo e 20 anexos por ticket.</p>
              {erroAnexos ? <p className="text-sm text-destructive" role="alert">{erroAnexos}</p> : null}
              {anexos.length > 0 ? (
                <div className="divide-y rounded-md border">
                  {anexos.map((arquivo) => (
                    <div key={`${arquivo.name}:${arquivo.size}:${arquivo.lastModified}`} className="flex min-w-0 items-center gap-3 p-3">
                      <File className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{arquivo.name}</div>
                        <div className="text-xs text-muted-foreground">{(arquivo.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" title={`Remover ${arquivo.name}`} onClick={() => setAnexos((atuais) => atuais.filter((item) => item !== arquivo))}>
                        <X className="h-4 w-4" /><span className="sr-only">Remover arquivo</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="space-y-4 border-t pt-5" aria-labelledby="tickets-relacionados-title">
              <div>
                <h2 id="tickets-relacionados-title" className="flex items-center gap-2 text-base font-semibold">
                  <Link2 className="h-4 w-4" /> Tickets relacionados
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Vincule demandas que tenham dependência ou contexto em comum.</p>
              </div>
              {ticketsRelacionaveis.length > 0 ? (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={buscaTicket} onChange={(event) => setBuscaTicket(event.target.value)} placeholder="Buscar por número ou título" className="pl-9" />
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                    {ticketsFiltrados.map((ticket) => (
                      <label key={ticket.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-secondary">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                          checked={ordemServicoIds.includes(ticket.id)}
                          onChange={(event) => alternarTicket(ticket.id, event.target.checked)}
                        />
                        <span className="min-w-0 text-sm">
                          <span className="block break-words font-medium">{ticket.codigo} - {ticket.titulo}</span>
                          <span className="text-xs text-muted-foreground">{statusLabels[ticket.status]}</span>
                        </span>
                      </label>
                    ))}
                    {ticketsFiltrados.length === 0 ? <p className="p-2 text-sm text-muted-foreground">Nenhum ticket encontrado.</p> : null}
                  </div>
                  <p className="text-xs text-muted-foreground" aria-live="polite">{ordemServicoIds.length} ticket(s) selecionado(s).</p>
                </>
              ) : <p className="text-sm text-muted-foreground">Ainda não existem outros tickets para relacionar.</p>}
            </section>
          </>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            Salvar ticket
          </Button>
        </div>
      </form>
    </Form>
  );
}
