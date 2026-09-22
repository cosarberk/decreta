{{- define "decreta.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "decreta.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "decreta.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "decreta.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "decreta.selectorLabels" -}}
app.kubernetes.io/name: {{ include "decreta.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Cluster içi Postgres servis adı */}}
{{- define "decreta.postgresHost" -}}
{{- printf "%s-postgres" (include "decreta.fullname" .) -}}
{{- end -}}

{{/* Public kök adres: config.PUBLIC_URL > ingress host > localhost */}}
{{- define "decreta.publicUrl" -}}
{{- if .Values.config.PUBLIC_URL -}}
{{- .Values.config.PUBLIC_URL -}}
{{- else if .Values.ingress.enabled -}}
{{- printf "http%s://%s" (ternary "s" "" .Values.ingress.tls.enabled) .Values.ingress.host -}}
{{- else -}}
{{- printf "http://localhost:%v" .Values.service.port -}}
{{- end -}}
{{- end -}}
